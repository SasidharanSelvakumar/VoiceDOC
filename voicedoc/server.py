"""
FastAPI Server for VoiceDoc.

This server exposes the local RAG pipeline and TTS functionality as a web API,
allowing a web frontend to upload documents, chat, and retrieve audio.

Client-Server Flow:
1. Client uploads a PDF -> Server processes and embeds it in ChromaDB.
2. Client sends a chat message -> Server runs the RAG chain and returns the text answer.
3. Client sends a speak request -> Server generates TTS audio and returns it as an mp3 file.
4. Client sends audio -> Server transcribes it using Whisper.
"""

import os
import shutil
import whisper # <-- NEW IMPORT
from typing import List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import json
import asyncio

from core.document import DocumentProcessor
from core.rag import RAGPipeline
from voice.tts import VoiceSpeaker

# Initialize FastAPI App
app = FastAPI(title="VoiceDoc API")

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Instances (keeps them loaded in memory)
processor = DocumentProcessor()
rag = RAGPipeline()
speaker = VoiceSpeaker()

# Initialize the Whisper AI Model for Voice-to-Text
# (Using 'base' for speed and efficiency)
print("Loading Whisper model...")
whisper_model = whisper.load_model("base")
print("Whisper model loaded!")

# Pydantic Models for Request Bodies
class ChatRequest(BaseModel):
    question: str
    session_id: str

class SpeakRequest(BaseModel):
    text: str

class ClearRequest(BaseModel):
    session_id: str

# API Endpoints

@app.post("/api/upload")
async def upload_files(session_id: str = Form(...), files: List[UploadFile] = File(...)):
    """
    Accepts multiple PDF documents, saves them temporarily, and processes them into the vector database.
    """
    try:
        uploaded_filenames = []
        os.makedirs("temp_uploads", exist_ok=True)
        
        for file in files:
            file_path = os.path.join("temp_uploads", file.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Process each document into the database with the given session_id
            processor.process_document(file_path, session_id)
            uploaded_filenames.append(file.filename)
            
        return {"message": f"Successfully uploaded {len(uploaded_filenames)} files", "files": uploaded_filenames}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Executes the RAG pipeline and streams the response tokens back to the client.
    """
    async def event_generator():
        # We use astream to get tokens one by one from the chain for this specific session
        chain = rag.get_chain(request.session_id)
        async for chunk in chain.astream({"question": request.question}):
            # Each chunk is a dictionary. We want the 'answer' part.
            if "answer" in chunk:
                yield f"data: {json.dumps({'token': chunk['answer']})}\n\n"
            
            # 2. Stream the source documents at the very end
            if "source_documents" in chunk:
                sources = [{
                    "file": os.path.basename(doc.metadata.get("source", "")),
                    "page": doc.metadata.get("page", -1) + 1
                } for doc in chunk["source_documents"]]
                yield f"data: {json.dumps({'sources': sources})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/speak")
async def speak(request: SpeakRequest):
    """
    Generates an audio file from text and returns the file to the client.
    """
    try:
        audio_path = speaker.generate_audio_file(request.text)
        if not audio_path or not os.path.exists(audio_path):
            raise HTTPException(status_code=500, detail="Audio generation failed.")
            
        return FileResponse(audio_path, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/clear")
async def clear_memory(session_id: str):
    """
    Clears the conversation memory for a given session.
    """
    try:
        rag.memory_manager.clear_memory(session_id)
        return {"message": "Memory cleared."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# NEW ENDPOINT: Transcribe Audio
@app.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Accepts an audio file, transcribes it using Whisper, and returns the text.
    """
    try:
        # 1. Create a temporary folder for audio
        os.makedirs("temp_audio", exist_ok=True)
        file_path = f"temp_audio/{file.filename}"
        
        # 2. Save the incoming audio file
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())
            
        # 3. Hand the file to Whisper for transcription
        result = whisper_model.transcribe(file_path)
        
        # 4. Clean up the audio file to save space
        os.remove(file_path)
        
        return {"text": result["text"]}
    except Exception as e:
        print(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Serve React Frontend ---
# Mount the built React app at the root. We do this *after* all API routes.
frontend_path = os.path.join(os.path.dirname(__file__), "frontend", "dist")

if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
    
    # Optional: Catch-all to support React Router
    @app.exception_handler(404)
    async def fallback_to_index(request, exc):
        return FileResponse(os.path.join(frontend_path, "index.html"))
else:
    print(f"Warning: Frontend build not found at {frontend_path}. Please run 'npm run build' in the frontend folder.")

if __name__ == "__main__":
    import uvicorn
    import multiprocessing
    multiprocessing.freeze_support() # Required for PyInstaller on Windows
    print("Starting VoiceDoc...")
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=False)