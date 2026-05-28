"""
Core module for VoiceDoc.

This package contains the foundational logic for the Retrieval-Augmented Generation (RAG) 
assistant. It is divided into submodules responsible for specific tasks:
- document.py: Handles reading, parsing, and chunking of user documents (e.g., PDFs).
- memory.py: Manages conversation history to allow the LLM to remember context.
- rag.py: Manages the vector database (ChromaDB), embeddings, and interactions with the local Ollama LLM.
"""
