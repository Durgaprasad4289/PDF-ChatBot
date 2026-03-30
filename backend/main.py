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
import gc

load_dotenv()

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ],
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
MAX_FILE_SIZE = 5 * 1024 * 1024
MAX_CHUNKS = 80

# Global state
embedding_model = None
faiss_index = None
chunks = None
chat_history = []

# MODELS
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
    reader = pypdf.PdfReader(io.BytesIO(file_bytes))
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text

# CHUNK
def chunk_text(text, chunk_size=300, overlap=50):
    out = []
    for i in range(0, len(text), chunk_size - overlap):
        chunk = text[i:i + chunk_size]
        if chunk.strip():
            out.append(chunk)
    return out

# Build FAISS index
def build_faiss_index(text_chunks):
    embeddings = embedding_model.encode(text_chunks)
    if len(embeddings.shape) == 1:
        embeddings = np.expand_dims(embeddings, axis=0)
    
    dim = embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings)
    return index

# Retrieve relevant chunks
def retrieve_chunks(question, text_chunks, index, top_k=3):
    q_embedding = embedding_model.encode([question])
    distances, indices = index.search(np.array(q_embedding, dtype=np.float32), top_k)
    return [text_chunks[i] for i in indices[0] if i < len(text_chunks)]

# UPLOAD
@app.post("/upload")
async def upload(files: List[UploadFile] = File(...)):
    global faiss_index, chunks, chat_history

    all_chunks = []

    for file in files:
        file_bytes = await file.read()

        if len(file_bytes) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large")

        text = extract_text_from_pdf(file_bytes)
        file_chunks = chunk_text(text)

        all_chunks.extend(file_chunks)
        if len(all_chunks) >= MAX_CHUNKS:
            break

    chunks = all_chunks[:MAX_CHUNKS]

    if not chunks:
        raise HTTPException(status_code=400, detail="No content")

    faiss_index = build_faiss_index(chunks)

    chat_history = []
    gc.collect()

    return {"status": "ok", "chunks": len(chunks)}

# CHAT
@app.post("/chat")
async def chat(req: ChatRequest):
    global faiss_index, chunks, chat_history

    if faiss_index is None:
        raise HTTPException(status_code=400, detail="Upload first")

    relevant = retrieve_chunks(req.question, chunks, faiss_index)
    context = "\n\n".join(relevant[:2])  # 🔥 limit

    messages = [{"role": "system", "content": "Answer from context only"}]
    messages += chat_history[-6:]

    messages.append({
        "role": "user",
        "content": f"Context:\n{context}\n\nQ: {req.question}"
    })

    answer = ""

    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        stream=True,
        max_tokens=500
    )

    for chunk in response:
        if chunk.choices[0].delta.content:
            answer += chunk.choices[0].delta.content

    chat_history.append({"role": "user", "content": req.question})
    chat_history.append({"role": "assistant", "content": answer})

    return {"answer": answer}

@app.get("/chat/stream")
async def chat_stream(question: str):
    global faiss_index, chunks, chat_history

    if faiss_index is None:
        raise HTTPException(status_code=400, detail="Upload first")

    relevant = retrieve_chunks(question, chunks, faiss_index)
    context = "\n\n".join(relevant[:2])

    async def stream_response():
        messages = [{"role": "system", "content": "Answer from context only"}]
        messages += chat_history[-6:]
        messages.append({
            "role": "user",
            "content": f"Context:\n{context}\n\nQ: {question}"
        })

        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                stream=True,
                max_tokens=600
            )

            full_answer = ""
            for chunk in response:
                if chunk.choices[0].delta.content:
                    token = chunk.choices[0].delta.content
                    full_answer += token
                    yield f"data: {json.dumps({'token': token})}\n\n"

            chat_history.append({"role": "user", "content": question})
            chat_history.append({"role": "assistant", "content": full_answer})
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(stream_response(), media_type="text/event-stream")

@app.get("/status")
async def status():
    return {
        "loaded": faiss_index is not None,
        "chunks": len(chunks) if chunks else 0,
        "history": len(chat_history)
    }

@app.post("/reset")
async def reset():
    global faiss_index, chunks, chat_history
    faiss_index = None
    chunks = None
    chat_history = []
    gc.collect()
    return {"status": "reset"}
