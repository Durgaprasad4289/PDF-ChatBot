# PDF Chatbot - Full Stack Application

A modern PDF chatbot built with **FastAPI backend** and **React frontend**. Upload multiple PDFs and ask questions using AI-powered RAG (Retrieval Augmented Generation) with fast semantic search.

## Features

- 📄 **Multiple PDF Support** - Upload and process multiple PDFs at once
- 🚀 **Fast RAG System** - Uses FAISS for efficient semantic search
- 💬 **Real-time Chat** - Streaming responses from Groq API
- 🎨 **Modern UI** - Beautiful React interface with drag-and-drop upload
- 💾 **Conversation Memory** - Maintains chat history for context-aware responses
- 📱 **Responsive Design** - Works on desktop and mobile devices

## Architecture

```
┌─────────────────────────────────────────┐
│          React Frontend                  │
│  (PDF Upload + Chat Interface)          │
└──────────────┬──────────────────────────┘
               │ HTTP/REST API
┌──────────────▼──────────────────────────┐
│       FastAPI Backend                    │
│  ┌──────────────────────────────────┐   │
│  │ PDF Processing & Embeddings      │   │
│  │ FAISS Indexing & Retrieval       │   │
│  │ Groq API Integration            │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Tech Stack

**Backend:**
- FastAPI - Modern Python web framework
- Groq API - Fast LLM inference
- FAISS - Vector similarity search
- Sentence Transformers - Embeddings
- pypdf - PDF processing

**Frontend:**
- React 18 - UI framework
- CSS3 - Styling with gradients and animations
- Fetch API - HTTP requests

## Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn
- Groq API Key (get it from https://console.groq.com)

## Installation

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Edit .env and add your Groq API key
# GROQ_API_KEY=your_api_key_here
```

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Update API URL if needed (default: http://localhost:8000)
```

## Running the Application

### Start the Backend

```bash
cd backend

# Activate virtual environment (if not already active)
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Run the FastAPI server
python main.py

# Or use uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at `http://localhost:8000`
API documentation: `http://localhost:8000/docs`

### Start the Frontend

In a new terminal:

```bash
cd frontend

# Start the development server
npm start
```

The frontend will automatically open at `http://localhost:3000`

## API Endpoints

### Upload PDFs
```
POST /upload
Content-Type: multipart/form-data

Request: Multiple PDF files
Response: { "status": "success", "message": "Indexed X chunks from Y PDF(s)" }
```

### Chat
```
POST /chat
Content-Type: application/json

Request: { "question": "Your question here" }
Response: { "answer": "AI response" }
```

### Chat Stream (Server-Sent Events)
```
GET /chat/stream?question=Your%20question
Response: Server-Sent Events with streaming tokens
```

### Status
```
GET /status
Response: { "loaded": boolean, "chunks": number, "messages": number }
```

### Reset
```
POST /reset
Response: { "status": "reset" }
```

## Configuration

### Backend (.env)
```
GROQ_API_KEY=your_groq_api_key_here
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:8000
```

For production, update `REACT_APP_API_URL` to your backend's public URL.

## Deployment

### Deploy Backend (Heroku, Railway, Render, etc.)

1. Create a `Procfile` in backend directory:
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

2. Add environment variable:
```
GROQ_API_KEY=your_api_key
```

3. Deploy using your platform's CLI

### Deploy Frontend (Vercel, Netlify, GitHub Pages)

```bash
# Build for production
npm run build

# Deploy the build folder to your hosting
```

## Performance Tips

1. **Chunk Size**: Adjust `chunk_size` in `backend/main.py` for optimal results (default: 600)
2. **Top-K Results**: Modify `top_k` parameter in `retrieve_chunks()` for more/fewer context chunks
3. **Model**: The embedding model used is `paraphrase-MiniLM-L3-v2` - lightweight and fast
4. **Temperature**: Set to 0.2 for factual, deterministic responses

## Troubleshooting

### Port Already in Use
```bash
# Find and kill process on port 8000
lsof -ti:8000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :8000   # Windows
```

### CORS Errors
The backend has CORS enabled for all origins. If issues persist:
1. Check that backend is running on the correct port
2. Update `REACT_APP_API_URL` in frontend .env

### Out of Memory
Large PDFs may cause memory issues. Solutions:
1. Reduce `chunk_size` in backend
2. Process fewer PDFs at a time
3. Use a machine with more RAM

### Slow Responses
1. Check internet connection to Groq API
2. Reduce the number of relevant chunks (`top_k`)
3. Use a faster embedding model or increase chunk size

## Future Enhancements

- [ ] Database storage for chat history
- [ ] Multi-user support with authentication
- [ ] Custom model selection
- [ ] Document highlighting and citations
- [ ] Export chat history
- [ ] Advanced search filters

## License

MIT

## Support

For issues or questions, please check the troubleshooting section or open an issue on GitHub.
