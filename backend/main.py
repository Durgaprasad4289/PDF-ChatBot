from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from openai import OpenAI
import pypdf
import json
from typing import List
import io
import gc
import math
import re
from collections import Counter

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://localhost:3000",
        "http://127.0.0.1:5173", "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

MODEL = "llama-3.3-70b-versatile"
MAX_FILE_SIZE = 10 * 1024 * 1024
MAX_CHUNKS = 200

# Global state
chunks: List[str] = []
chat_history: List[dict] = []


# ── Retrieval: pure-Python BM25 (no numpy, no faiss, no torch) ──────────────

def tokenize(text: str) -> List[str]:
    return re.findall(r'\b\w+\b', text.lower())

def build_bm25_index(text_chunks: List[str]):
    """Returns (df, avgdl, tokenized_chunks)."""
    tokenized = [tokenize(c) for c in text_chunks]
    avgdl = sum(len(t) for t in tokenized) / max(len(tokenized), 1)
    df: Counter = Counter()
    for doc in tokenized:
        for term in set(doc):
            df[term] += 1
    return tokenized, df, avgdl

def bm25_score(query_terms, doc_terms, df, n_docs, avgdl, k1=1.5, b=0.75):
    dl = len(doc_terms)
    tf_map = Counter(doc_terms)
    score = 0.0
    for term in query_terms:
        if term not in tf_map:
            continue
        tf = tf_map[term]
        idf = math.log((n_docs - df[term] + 0.5) / (df[term] + 0.5) + 1)
        score += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * dl / avgdl))
    return score

def retrieve_chunks(question: str, text_chunks: List[str], top_k=4) -> List[str]:
    tokenized_chunks, df, avgdl = build_bm25_index(text_chunks)
    query_terms = tokenize(question)
    n = len(text_chunks)
    scores = [
        bm25_score(query_terms, doc, df, n, avgdl)
        for doc in tokenized_chunks
    ]
    top_indices = sorted(range(n), key=lambda i: scores[i], reverse=True)[:top_k]
    return [text_chunks[i] for i in top_indices]


# ── PDF processing ───────────────────────────────────────────────────────────

def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = pypdf.PdfReader(io.BytesIO(file_bytes))
    return "\n".join(page.extract_text() or "" for page in reader.pages)

def chunk_text(text: str, chunk_size=600, overlap=80) -> List[str]:
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    out, current = [], ""
    for sentence in sentences:
        if len(current) + len(sentence) + 1 <= chunk_size:
            current += (" " if current else "") + sentence
        else:
            if current:
                out.append(current.strip())
            carry = current[-overlap:] if len(current) > overlap else current
            current = (carry + " " + sentence).strip()
    if current.strip():
        out.append(current.strip())
    return [c for c in out if len(c) > 20]


# ── Helpers ──────────────────────────────────────────────────────────────────

def build_messages(context: str, question: str) -> List[dict]:
    system = (
        "You are a helpful assistant. Answer using ONLY the provided context. "
        "If the answer isn't in the context, say so clearly. Be concise and accurate."
    )
    messages = [{"role": "system", "content": system}]
    messages += chat_history[-6:]
    messages.append({
        "role": "user",
        "content": f"Context:\n{context}\n\nQuestion: {question}"
    })
    return messages


class ChatRequest(BaseModel):
    question: str


# ── Routes ───────────────────────────────────────────────────────────────────

@app.post("/upload")
async def upload(files: List[UploadFile] = File(...)):
    global chunks, chat_history

    all_text = ""
    for file in files:
        file_bytes = await file.read()
        if len(file_bytes) > MAX_FILE_SIZE:
            raise HTTPException(400, detail=f"'{file.filename}' exceeds 10MB limit")
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(400, detail="Only PDF files supported")
        all_text += extract_text_from_pdf(file_bytes) + "\n"

    new_chunks = chunk_text(all_text)[:MAX_CHUNKS]
    if not new_chunks:
        raise HTTPException(400, detail="No readable text found in PDF(s)")

    chunks = new_chunks
    chat_history = []
    gc.collect()

    return {"status": "ok", "chunks": len(chunks)}


@app.post("/chat")
async def chat(req: ChatRequest):
    global chat_history
    if not chunks:
        raise HTTPException(400, detail="Upload a PDF first")

    relevant = retrieve_chunks(req.question, chunks)
    context = "\n\n---\n\n".join(relevant)
    messages = build_messages(context, req.question)

    response = client.chat.completions.create(
        model=MODEL, messages=messages, max_tokens=800
    )
    answer = response.choices[0].message.content

    chat_history.append({"role": "user", "content": req.question})
    chat_history.append({"role": "assistant", "content": answer})
    return {"answer": answer}


@app.get("/chat/stream")
async def chat_stream(question: str):
    if not chunks:
        raise HTTPException(400, detail="Upload a PDF first")

    relevant = retrieve_chunks(question, chunks)
    context = "\n\n---\n\n".join(relevant)
    messages = build_messages(context, question)

    async def generate():
        full_answer = ""
        try:
            response = client.chat.completions.create(
                model=MODEL, messages=messages, stream=True, max_tokens=800
            )
            for event in response:
                token = event.choices[0].delta.content
                if token:
                    full_answer += token
                    yield f"data: {json.dumps({'token': token})}\n\n"

            chat_history.append({"role": "user", "content": question})
            chat_history.append({"role": "assistant", "content": full_answer})
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.get("/status")
async def status():
    return {
        "loaded": bool(chunks),
        "chunks": len(chunks),
        "history_turns": len(chat_history) // 2,
    }


@app.post("/reset")
async def reset():
    global chunks, chat_history
    chunks = []
    chat_history = []
    gc.collect()
    return {"status": "reset"}