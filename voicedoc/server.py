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
import sys
import shutil
import whisper # <-- NEW IMPORT
import json
import asyncio
import secrets
import uuid
from typing import List
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel

from google.oauth2 import id_token
from google.auth.transport import requests

from core.database import get_db, User, ChatHistory, SessionFile, ChatSessionMetadata, SessionLocal
from core.auth import get_password_hash, verify_password, create_access_token

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
    session_id: str
    question: str
    engine_type: str = "local" # local or cloud
    api_key: str = None # Used only if cloud
    
class GoogleAuthRequest(BaseModel):
    credential: str

class SpeakRequest(BaseModel):
    text: str

class ClearRequest(BaseModel):
    session_id: str

class UserCreate(BaseModel):
    email: str
    password: str

class RenameRequest(BaseModel):
    name: str

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        import jwt
        from core.auth import SECRET_KEY, ALGORITHM
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("email") or payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# API Endpoints

@app.post("/api/auth/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pwd = get_password_hash(user.password)
    new_user = User(email=user.email, hashed_password=hashed_pwd)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = create_access_token(data={"sub": new_user.email, "email": new_user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/google")
def google_auth(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    try:
        # Specify the CLIENT_ID of the app that accesses the backend
        client_id = "781728534000-edg41inp76attf4p66vv2an8dq0o5df1.apps.googleusercontent.com"
        # Add clock_skew_in_seconds=60 to prevent errors if the computer's clock is slightly off
        idinfo = id_token.verify_oauth2_token(request.credential, requests.Request(), client_id, clock_skew_in_seconds=60)

        # ID token is valid. Get the user's email.
        email = idinfo['email']
        
        # Look up user or create new one
        user = db.query(User).filter(User.email == email).first()
        if not user:
            # Create a random password since they are authenticating via Google
            random_password = secrets.token_urlsafe(32)
            user = User(
                email=email,
                hashed_password=get_password_hash(random_password)
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
        # Issue our standard JWT
        access_token = create_access_token(data={"sub": user.email})
        return {"access_token": access_token, "token_type": "bearer"}
        
    except ValueError as e:
        print(f"Google Token Verification Error: {e}")
        # Invalid token
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

@app.get("/api/auth/me")
def read_users_me(current_user: User = Depends(get_current_user)):
    return {"email": current_user.email}

@app.post("/api/upload")
async def upload_files(session_id: str = Form(...), files: List[UploadFile] = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Accepts multiple PDF documents, saves them temporarily, and processes them into the vector database.
    """
    try:
        # Check session ownership if session already exists
        metadata = db.query(ChatSessionMetadata).filter(ChatSessionMetadata.session_id == session_id).first()
        if metadata and metadata.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to upload to this session")

        # Create user-specific permanent upload directory
        user_upload_dir = f"data/uploads/{current_user.id}/{session_id}"
        os.makedirs(user_upload_dir, exist_ok=True)
        
        uploaded_filenames = []
        for file in files:
            safe_filename = os.path.basename(file.filename)
            file_path = os.path.join(user_upload_dir, safe_filename)
            with open(file_path, "wb") as buffer:
                buffer.write(await file.read())
            
            # Process each document into the database with the given session_id
            processor.process_document(file_path, session_id)
            uploaded_filenames.append(safe_filename)
            
            # Save file record to database
            new_file = SessionFile(user_id=current_user.id, session_id=session_id, filename=safe_filename)
            db.add(new_file)
            
        db.commit()
        return {"message": f"Successfully uploaded {len(uploaded_filenames)} files", "files": uploaded_filenames}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chat/history")
def get_chat_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    history = db.query(ChatHistory).filter(ChatHistory.user_id == current_user.id).order_by(ChatHistory.timestamp).all()
    files_db = db.query(SessionFile).filter(SessionFile.user_id == current_user.id).order_by(SessionFile.timestamp).all()
    metadata_db = db.query(ChatSessionMetadata).filter(ChatSessionMetadata.user_id == current_user.id).all()
    
    metadata_dict = {m.session_id: m.name for m in metadata_db}
    
    sessions_dict = {}
    
    for msg in history:
        sid = msg.session_id
        if sid not in sessions_dict:
            sessions_dict[sid] = {
                "id": sid,
                "name": metadata_dict.get(sid, f"Session {sid[-6:]}"),
                "messages": [],
                "files": [],
                "modified": msg.timestamp.isoformat()
            }
        
        sessions_dict[sid]["messages"].append({
            "role": msg.role,
            "content": msg.content
        })
        sessions_dict[sid]["modified"] = msg.timestamp.isoformat()
        
    for f in files_db:
        sid = f.session_id
        if sid not in sessions_dict:
            sessions_dict[sid] = {
                "id": sid,
                "name": metadata_dict.get(sid, f"Session {sid[-6:]}"),
                "messages": [],
                "files": [],
                "modified": f.timestamp.isoformat()
            }
        sessions_dict[sid]["files"].append({"name": f.filename})
        # If the file was uploaded more recently than the last message, update the modified time
        if f.timestamp.isoformat() > sessions_dict[sid]["modified"]:
            sessions_dict[sid]["modified"] = f.timestamp.isoformat()
        
    return {"sessions": list(sessions_dict.values())}

@app.put("/api/chat/session/{session_id}")
def rename_session(session_id: str, request: RenameRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    meta = db.query(ChatSessionMetadata).filter(ChatSessionMetadata.session_id == session_id, ChatSessionMetadata.user_id == current_user.id).first()
    if meta:
        meta.name = request.name
    else:
        meta = ChatSessionMetadata(session_id=session_id, user_id=current_user.id, name=request.name)
        db.add(meta)
    db.commit()
    return {"message": "Session renamed successfully"}

@app.post("/api/chat")
def chat_with_agent(request: ChatRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 0. Check session ownership
    metadata = db.query(ChatSessionMetadata).filter(ChatSessionMetadata.session_id == request.session_id).first()
    if metadata and metadata.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this session")

    # 1. Load previous memory if it exists and hasn't been loaded
    history = db.query(ChatHistory).filter(ChatHistory.session_id == request.session_id).order_by(ChatHistory.timestamp).all()
    if history:
        db_messages = [{"role": msg.role, "content": msg.content} for msg in history]
        rag.memory_manager.load_history(request.session_id, db_messages)

    # 2. Save user message to database
    user_msg = ChatHistory(user_id=current_user.id, session_id=request.session_id, role="user", content=request.question)
    db.add(user_msg)
    db.commit()

    # 3. Get AI Response
    # Assuming RAGPipeline has a method ask_question that performs full synchronous retrieval
    # or we handle the streaming via the event_generator below
    
    async def event_generator():
        # We use astream to get tokens one by one from the chain for this specific session
        chain = rag.get_chain(request.session_id, request.engine_type, request.api_key)
        full_answer = ""
        async for chunk in chain.astream({"question": request.question}):
            # Each chunk is a dictionary. We want the 'answer' part.
            if "answer" in chunk:
                full_answer += chunk["answer"]
                yield f"data: {json.dumps({'token': chunk['answer']})}\n\n"
            
            # 2. Stream the source documents at the very end
            if "source_documents" in chunk:
                sources = [{
                    "file": os.path.basename(doc.metadata.get("source", "")),
                    "page": doc.metadata.get("page", -1) + 1
                } for doc in chunk["source_documents"]]
                yield f"data: {json.dumps({'sources': sources})}\n\n"
        
        with SessionLocal() as db:
            ai_msg = ChatHistory(user_id=current_user.id, session_id=request.session_id, role='ai', content=full_answer)
            db.add(ai_msg)
            db.commit()

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/speak")
async def speak(request: SpeakRequest, background_tasks: BackgroundTasks):
    """
    Generates an audio file from text and returns the file to the client.
    """
    try:
        audio_path = speaker.generate_audio_file(request.text)
        if not audio_path or not os.path.exists(audio_path):
            raise HTTPException(status_code=500, detail="Audio generation failed.")
            
        def remove_file(path: str):
            if os.path.exists(path):
                os.remove(path)
                
        background_tasks.add_task(remove_file, audio_path)
        return FileResponse(audio_path, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/clear")
async def clear_memory(session_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Clears the conversation memory for a given session.
    """
    try:
        # Check ownership
        metadata = db.query(ChatSessionMetadata).filter(ChatSessionMetadata.session_id == session_id).first()
        if metadata and metadata.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to clear this session")
            
        rag.memory_manager.clear_memory(session_id)
        return {"message": "Memory cleared."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/chat/session/{session_id}")
async def delete_session(session_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Permanently deletes a session and its associated files from disk and database.
    """
    try:
        # Check ownership
        metadata = db.query(ChatSessionMetadata).filter(ChatSessionMetadata.session_id == session_id).first()
        if not metadata:
            raise HTTPException(status_code=404, detail="Session not found")
        if metadata.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this session")
            
        # Delete from DB
        db.query(ChatHistory).filter(ChatHistory.session_id == session_id).delete()
        db.query(SessionFile).filter(SessionFile.session_id == session_id).delete()
        db.query(ChatSessionMetadata).filter(ChatSessionMetadata.session_id == session_id).delete()
        db.commit()
        
        # Clear AI memory
        rag.memory_manager.clear_memory(session_id)
        
        # Delete files from disk
        user_upload_dir = f"data/uploads/{current_user.id}/{session_id}"
        if os.path.exists(user_upload_dir):
            shutil.rmtree(user_upload_dir)
            
        return {"message": "Session permanently deleted"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
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
        safe_filename = f"{uuid.uuid4().hex}_{os.path.basename(file.filename)}"
        file_path = f"temp_audio/{safe_filename}"
        
        # 2. Save the incoming audio file
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())
            
        # 3. Hand the file to Whisper for transcription
        result = whisper_model.transcribe(file_path)
        
        # 4. Clean up the audio file to save space
        if os.path.exists(file_path):
            os.remove(file_path)
        
        return {"text": result["text"]}
    except Exception as e:
        print(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Serve React Frontend ---
# Mount the built React app at the root. We do this *after* all API routes.
def get_base_path():
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))

base_path = get_base_path()
frontend_path = os.path.join(base_path, "frontend", "dist")

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