import PyInstaller.__main__
import os

print("Building VoiceDoc Server...")

# Paths
current_dir = os.path.dirname(os.path.abspath(__file__))
frontend_dist = os.path.join(current_dir, "frontend", "dist")

if not os.path.exists(frontend_dist):
    print("ERROR: frontend/dist not found. Please run 'npm run build' in the frontend folder first.")
    exit(1)

PyInstaller.__main__.run([
    'server.py',
    '--name=VoiceDoc',
    '--onedir',
    '--noconfirm',
    '--clean',
    
    # Add frontend build
    f'--add-data={frontend_dist};frontend/dist',
    
    # Hidden imports for FastAPI and Uvicorn
    '--hidden-import=uvicorn.logging',
    '--hidden-import=uvicorn.loops',
    '--hidden-import=uvicorn.loops.auto',
    '--hidden-import=uvicorn.protocols',
    '--hidden-import=uvicorn.protocols.http',
    '--hidden-import=uvicorn.protocols.http.auto',
    '--hidden-import=uvicorn.protocols.websockets',
    '--hidden-import=uvicorn.protocols.websockets.auto',
    '--hidden-import=uvicorn.lifespan',
    '--hidden-import=uvicorn.lifespan.on',
    
    # Hidden imports for LangChain
    '--collect-all=langchain',
    '--collect-all=langchain_community',
    '--collect-all=langchain_groq',
    '--collect-all=langchain_huggingface',
    '--collect-all=langchain_core',
    '--collect-all=langchain_text_splitters',
    '--collect-all=langchain_classic',
    
    # Hidden imports for ML
    '--collect-all=whisper',
    '--collect-all=sentence_transformers',
    '--collect-all=chromadb',
    '--hidden-import=pydantic',
    '--hidden-import=groq',
    
    # New Auth & DB imports
    '--hidden-import=sqlalchemy',
    '--hidden-import=passlib',
    '--hidden-import=bcrypt',
    '--hidden-import=jwt',
])

print("Build Complete! The executable is located in dist/VoiceDoc/")
