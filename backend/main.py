from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from openai import OpenAI
import pypdf
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
import asyncio
import json
from typing import List
import io

load_dotenv()

app = FastAPI()

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Groq Client
client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

MODEL = "llama-3.3-70b-versatile"

# Global state
embedding_model = None
faiss_index = None
chunks = None
chat_history = []

# Pydantic models
class ChatRequest(BaseModel):
    question: str

class ChatResponse(BaseModel):
    answer: str

# Load embedding model
@app.on_event("startup")
async def load_model():
    global embedding_model
    embedding_model = SentenceTransformer("paraphrase-MiniLM-L3-v2")
    print("✅ Embedding model loaded")

# Extract text from PDF
def extract_text_from_pdf(file_bytes):
    pdf_file = io.BytesIO(file_bytes)
    reader = pypdf.PdfReader(pdf_file)
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text

# Chunk text
def chunk_text(text, chunk_size=600, overlap=100):
    chunks = []
    for i in range(0, len(text), chunk_size - overlap):
        chunk = text[i:i + chunk_size]
        if chunk.strip():
            chunks.append(chunk)
    return chunks

# Build FAISS index
def build_faiss_index(text_chunks):
    embeddings = embedding_model.encode(text_chunks)
    if len(embeddings.shape) == 1:
        embeddings = np.expand_dims(embeddings, axis=0)
    
    dim = embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(np.array(embeddings, dtype=np.float32))
    return index

# Retrieve relevant chunks
def retrieve_chunks(question, text_chunks, index, top_k=3):
    q_embedding = embedding_model.encode([question])
    distances, indices = index.search(np.array(q_embedding, dtype=np.float32), top_k)
    return [text_chunks[i] for i in indices[0] if i < len(text_chunks)]

@app.post("/upload")
async def upload_pdfs(files: List[UploadFile] = File(...)):
    global faiss_index, chunks, chat_history
    
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")
    
    all_text = ""
    
    try:
        for file in files:
            if file.content_type != "application/pdf":
                raise HTTPException(status_code=400, detail=f"File {file.filename} is not a PDF")
            
            file_bytes = await file.read()
            text = extract_text_from_pdf(file_bytes)
            all_text += text + "\n\n"
        
        if not all_text.strip():
            raise HTTPException(status_code=400, detail="No text found in PDFs")
        
        chunks = chunk_text(all_text)
        
        if not chunks:
            raise HTTPException(status_code=400, detail="Chunking failed")
        
        faiss_index = build_faiss_index(chunks)
        chat_history = []  # Reset chat history
        
        return {
            "status": "success",
            "message": f"Indexed {len(chunks)} chunks from {len(files)} PDF(s)"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat(request: ChatRequest):
    global faiss_index, chunks, chat_history
    
    if faiss_index is None or chunks is None:
        raise HTTPException(status_code=400, detail="No PDFs uploaded. Please upload PDFs first.")
    
    question = request.question
    
    # Retrieve relevant chunks
    relevant_chunks = retrieve_chunks(question, chunks, faiss_index)
    
    if not relevant_chunks:
        context = ""
        answer = "I couldn't find relevant information in the uploaded PDFs."
    else:
        context = "\n\n".join(relevant_chunks)
        
        # Build messages with memory (last 6 exchanges = 3 Q&A pairs)
        messages = [
            {
                "role": "system",
                "content": (
                    "Answer ONLY using the provided context.\n"
                    "If the information is not in the context, say 'Not found in the provided documents'.\n"
                    "Be helpful and concise."
                )
            }
        ]
        
        # Add chat history (last 3 exchanges)
        messages += chat_history[-6:]
        
        # Add current question with context
        messages.append({
            "role": "user",
            "content": f"Context from documents:\n{context}\n\nQuestion: {question}"
        })
        
        # Get streaming response
        answer = ""
        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                temperature=0.2,
                max_tokens=1000,
                stream=True
            )
            
            for chunk in response:
                if chunk.choices[0].delta.content:
                    answer += chunk.choices[0].delta.content
        
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    # Update chat history
    chat_history.append({"role": "user", "content": question})
    chat_history.append({"role": "assistant", "content": answer})
    
    return ChatResponse(answer=answer)

@app.get("/chat/stream")
async def chat_stream(question: str):
    global faiss_index, chunks, chat_history
    
    if faiss_index is None or chunks is None:
        raise HTTPException(status_code=400, detail="No PDFs uploaded")
    
    relevant_chunks = retrieve_chunks(question, chunks, faiss_index)
    
    async def stream_response():
        context = "\n\n".join(relevant_chunks) if relevant_chunks else ""
        
        messages = [
            {
                "role": "system",
                "content": "Answer ONLY using the provided context. If not found, say 'Not found in documents'."
            }
        ]
        
        messages += chat_history[-6:]
        messages.append({
            "role": "user",
            "content": f"Context:\n{context}\n\nQuestion: {question}"
        })
        
        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                temperature=0.2,
                stream=True
            )
            
            full_answer = ""
            for chunk in response:
                if chunk.choices[0].delta.content:
                    token = chunk.choices[0].delta.content
                    full_answer += token
                    yield f"data: {json.dumps({'token': token})}\n\n"
            
            # Update history
            chat_history.append({"role": "user", "content": question})
            chat_history.append({"role": "assistant", "content": full_answer})
            
            yield f"data: {json.dumps({'done': True})}\n\n"
        
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream"
    )

@app.get("/status")
async def status():
    return {
        "loaded": faiss_index is not None,
        "chunks": len(chunks) if chunks else 0,
        "messages": len(chat_history)
    }

@app.post("/reset")
async def reset():
    global faiss_index, chunks, chat_history
    faiss_index = None
    chunks = None
    chat_history = []
    return {"status": "reset"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)