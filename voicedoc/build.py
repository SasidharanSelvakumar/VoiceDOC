import PyInstaller.__main__
import os

PyInstaller.__main__.run([
    'server.py',
    '--name=VoiceDoc',
    '--onedir', # Use onedir instead of onefile for faster startup and fewer temp extraction issues with large AI models
    '--add-data=frontend/dist;frontend/dist',
    '--hidden-import=uvicorn',
    '--hidden-import=fastapi',
    '--hidden-import=langchain',
    '--hidden-import=langchain_community',
    '--hidden-import=langchain_core',
    '--hidden-import=langchain_core',
    '--hidden-import=langchain_classic',
    '--hidden-import=langchain_chroma',
    '--hidden-import=langchain_ollama',
    '--hidden-import=langchain_text_splitters',
    '--hidden-import=chromadb',
    '--hidden-import=whisper',
    '--hidden-import=torch',
    '--hidden-import=pydantic',
    '--hidden-import=multipart',
    '--hidden-import=websockets',
    '--collect-all=langchain',
    '--collect-all=langchain_classic',
    '--collect-all=langchain_community',
    '--collect-all=langchain_core',
    '--collect-all=chromadb',
    '--clean',
    '--noconfirm',
])
