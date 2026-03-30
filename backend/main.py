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
import json
from typing import List
import io
import gc
import requests

load_dotenv()

app = FastAPI()

# ===== CORS =====
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== GROQ CLIENT =====
groq_client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

HF_TOKEN = os.getenv("HF_TOKEN")

MODEL = "llama-3.3-70b-versatile"
MAX_FILE_SIZE = 5 * 1024 * 1024
MAX_CHUNKS = 30

# ===== GLOBAL STATE =====
faiss_index = None
chunks = None
chat_history = []

# ===== REQUEST MODEL =====
class ChatRequest(BaseModel):
    question: str


# ===== EMBEDDINGS (HF API) =====
def get_embedding(texts):
    url = "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction"

    headers = {
        "Authorization": f"Bearer {HF_TOKEN}"
    }

    response = requests.post(url, headers=headers, json={"inputs": texts})

    if response.status_code != 200:
        print(response.text)
        raise HTTPException(status_code=500, detail="HF embedding failed")

    data = response.json()

    return np.array(data, dtype=np.float32)


# ===== PDF TEXT =====
def extract_text_from_pdf(file_bytes):
    reader = pypdf.PdfReader(io.BytesIO(file_bytes))
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text


# ===== CHUNKING =====
def chunk_text(text, chunk_size=300, overlap=50):
    out = []
    for i in range(0, len(text), chunk_size - overlap):
        chunk = text[i:i + chunk_size]
        if chunk.strip():
            out.append(chunk)
    return out


# ===== FAISS =====
def build_faiss_index(text_chunks):
    embeddings = get_embedding(text_chunks)

    dim = embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings)
    return index


def retrieve_chunks(question, text_chunks, index, top_k=3):
    q_embedding = get_embedding([question])
    distances, indices = index.search(q_embedding, top_k)
    return [text_chunks[i] for i in indices[0] if i < len(text_chunks)]


# ===== UPLOAD =====
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


# ===== CHAT =====
@app.post("/chat")
async def chat(req: ChatRequest):
    global faiss_index, chunks, chat_history

    if faiss_index is None:
        raise HTTPException(status_code=400, detail="Upload first")

    relevant = retrieve_chunks(req.question, chunks, faiss_index)
    context = "\n\n".join(relevant[:2])

    messages = [{"role": "system", "content": "Answer from context only"}]
    messages += chat_history[-6:]

    messages.append({
        "role": "user",
        "content": f"Context:\n{context}\n\nQ: {req.question}"
    })

    response = groq_client.chat.completions.create(
        model=MODEL,
        messages=messages,
        max_tokens=400
    )

    answer = response.choices[0].message.content

    chat_history.append({"role": "user", "content": req.question})
    chat_history.append({"role": "assistant", "content": answer})

    return {"answer": answer}


# ===== CHAT STREAM =====
@app.get("/chat/stream")
async def chat_stream(question: str):
    global faiss_index, chunks, chat_history

    if faiss_index is None:
        raise HTTPException(status_code=400, detail="Upload first")

    def generate_response(question_str: str):
        relevant = retrieve_chunks(question_str, chunks, faiss_index)
        context = "\n\n".join(relevant[:2])

        messages = [{"role": "system", "content": "Answer from context only"}]
        messages += chat_history[-6:]
        messages.append({
            "role": "user",
            "content": f"Context:\n{context}\n\nQ: {question_str}"
        })

        response = groq_client.chat.completions.create(
            model=MODEL,
            messages=messages,
            max_tokens=400,
            stream=True
        )

        full_answer = ""
        for chunk in response:
            if chunk.choices[0].delta.content:
                token = chunk.choices[0].delta.content
                full_answer += token
                yield f"data: {json.dumps({'token': token})}\n\n"

        chat_history.append({"role": "user", "content": question_str})
        chat_history.append({"role": "assistant", "content": full_answer})

    return StreamingResponse(generate_response(question), media_type="text/event-stream")


# ===== STATUS =====
@app.get("/status")
async def status():
    return {
        "loaded": faiss_index is not None,
        "chunks": len(chunks) if chunks else 0,
        "history": len(chat_history)
    }


# ===== RESET =====
@app.post("/reset")
async def reset():
    global faiss_index, chunks, chat_history
    faiss_index = None
    chunks = None
    chat_history = []
    gc.collect()
    return {"status": "reset"}
# ===== RUN =====
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8000))
    )
