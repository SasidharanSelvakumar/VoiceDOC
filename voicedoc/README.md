# SASI.AI (VoiceDoc) - Architecture & Technical Documentation

Welcome to the internal documentation for **SASI.AI** (formerly VoiceDoc). This document explains exactly how the backend, frontend, AI engines, and desktop executable all fit together.

## 1. High-Level Architecture

SASI.AI is a fully local, offline-capable Retrieval-Augmented Generation (RAG) assistant. It features a modern React frontend wrapped around a powerful FastAPI Python backend.

### The Stack
- **Frontend**: React, Vite, Lucide-React (Icons), with Holographic/Glassmorphic UI
- **Backend API**: FastAPI (Python) with Server-Sent Events (SSE) for streaming
- **AI Orchestration**: LangChain
- **Vector Database**: ChromaDB
- **Local LLM**: Ollama (Mistral / Nomic-Embed-Text)
- **Audio Processing**: OpenAI Whisper (Local)
- **Desktop Packaging**: PyInstaller

## 2. How the Backend Works (`server.py`)

The terminal backend you see when running `server.py` is an **ASGI Web Server** powered by Uvicorn and FastAPI. It does three main things simultaneously:

### A. Serving the REST API
The server exposes specific "endpoints" that the React frontend talks to:
- `POST /upload`: Receives PDF files, passes them to the AI core for processing, and associates them with a `session_id`.
- `POST /chat`: Receives text messages, queries the local AI for a response using the document context and conversation memory, and streams the answer back in real-time using Server-Sent Events (SSE).
- `POST /transcribe`: Receives audio voice recordings (via the pulsing microphone toggle) and runs them through the local Whisper AI model to convert speech into text.
- `POST /speak`: Generates Text-to-Speech (TTS) audio files from the AI's response for voice synthesis.

### B. Serving the React App
To make this a single cohesive application (instead of requiring you to run a separate Node.js server), `server.py` is configured to serve the `frontend/dist` directory as static files. When you navigate to the root url (`/`), FastAPI returns the compiled React `index.html`.

### C. Initializing the AI Engine (`core/rag.py`)
When the server boots, it immediately creates an instance of the `RAGPipeline`. This loads the connection to ChromaDB and Ollama so they are warm and ready to answer questions.

## 3. How the AI Engine Works (RAG)

"RAG" stands for Retrieval-Augmented Generation. This is what allows SASI.AI to answer questions based *only* on the documents you upload.

1. **Ingestion (`core/document.py`)**: When you upload a PDF, the backend reads the text, splits it into smaller "chunks" (to fit into the AI's memory limit), and converts those chunks into mathematical vectors (embeddings) using `nomic-embed-text`.
2. **Storage (ChromaDB)**: These vectors are saved locally in a database folder (`./chroma_db`). Every chunk is tagged with a `session_id`.
3. **Retrieval (`core/rag.py`)**: When you ask a question, the system searches ChromaDB for chunks that mathematically match your question, filtering strictly by your active `session_id` to ensure context isolation.
4. **Memory (`core/memory.py`)**: The system utilizes `ConversationBufferMemory` to maintain context-aware conversation history, ensuring the AI remembers previous questions within the same session.
5. **Generation (Ollama)**: The backend takes your question, the conversation history, AND the retrieved document text, and bundles them into a strict prompt. This prompt is sent to `Mistral` (via Ollama), forcing the AI to answer using *only* the provided text (eliminating hallucinations) and streaming the response token-by-token.

## 4. Multi-Session Isolation

SASI.AI supports multiple separate workspaces simultaneously. 
- When you click "+ New Workspace" in the React UI, the frontend generates a unique `session_id` (e.g., `web-session-abc123`).
- Every time you upload a file or send a message, the frontend attaches this `session_id` to the request.
- **Why this matters**: ChromaDB uses this ID to partition your documents. If you upload a Legal Contract to Workspace A, and a Biology Textbook to Workspace B, asking a question in Workspace A will *never* pull information from the Biology Textbook. The AI's context is strictly isolated.

## 5. How the Desktop App Works (Electron + PyInstaller)

To turn this complex web stack into a single, seamless, double-clickable desktop app, we use a combination of **PyInstaller** and **Electron**.

1. **Backend Bundling (PyInstaller)**: We use PyInstaller (`build.py`) to trace `server.py` and collect every single Python dependency (FastAPI, LangChain, Torch, Whisper) into a single standalone folder (`dist/VoiceDoc`).
2. **Frontend Compilation (Vite)**: The React app is compiled into static HTML/CSS/JS files inside `frontend/dist`.
3. **The Electron Wrapper (`frontend/main.cjs`)**: Electron acts as the native desktop window. When you launch the app, Electron does the following silently:
   - **Spawns the Backend**: It automatically launches the bundled Python executable (`VoiceDoc.exe`) in the background as a hidden child process.
   - **Waits for Readiness**: It constantly pings `http://127.0.0.1:8000/` until the Python server is fully booted and ready.
   - **Displays the UI**: Once the backend responds, Electron finally displays the native desktop window and loads the local server URL. 
4. **Graceful Shutdown**: When you click the 'X' to close the Electron window, the app listens for the `window-all-closed` event and automatically kills the hidden Python child process, preventing orphaned background processes or port conflicts (e.g., "port 8000 already in use").

This architecture gives you the power of a full Python AI stack, with the clean, frameless user experience of a native Windows application.
