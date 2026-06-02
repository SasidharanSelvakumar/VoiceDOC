# SASI.AI (formerly VoiceDoc) - The Complete Guide

Welcome to **SASI.AI**, a powerful, fully local, and completely private AI assistant designed to read your documents, listen to your voice, and answer your questions—all without needing an internet connection.

This document is designed for **everyone**, whether you are a non-technical user curious about how it works, or a developer looking to understand the architecture.

---

## 🌟 What is SASI.AI?

SASI.AI is a desktop application that acts as your personal, intelligent document assistant. 
Imagine having a highly knowledgeable intern who has read all your PDFs and can instantly answer any question you have about them. That's SASI.AI.

**Key Features:**
- **Chat with your Documents:** Upload PDFs and ask questions about them.
- **Voice Interaction:** Speak your questions out loud, and let the AI talk back to you.
- **100% Private & Local:** Nothing is sent to the cloud. All processing happens on your own computer, ensuring your sensitive data remains completely secure.
- **Multiple Workspaces:** Work on a legal contract in one window and a biology textbook in another without mixing them up.

---

## 🤔 Why Build This?

In a world where most AI tools (like ChatGPT) require an internet connection and send your data to corporate servers, privacy is a major concern. Businesses and individuals often have sensitive documents (legal files, medical records, proprietary research) that they simply cannot upload to the cloud. 

SASI.AI was built to solve this problem: **To provide state-of-the-art AI capabilities entirely on your local machine, guaranteeing 100% data privacy.**

---

## 🛠️ How It Works: The Tech Stack Explained

To make this magic happen, SASI.AI combines several cutting-edge technologies. Let's break them down into simple terms:

### 1. The Frontend (What You See)
The frontend is the visual interface you interact with—the buttons, the chat window, the futuristic "glass" design.
- **What it is:** React, Vite, and Vanilla CSS (with Holographic/Glassmorphic UI).
- **Why we use it:** React allows us to build a smooth, dynamic, and responsive user interface. The glassmorphic design gives it a modern, premium feel.
- **How it works:** It acts as the messenger, taking your clicks, typed text, and voice recordings, and sending them to the "Backend" to be processed.

### 2. The Backend (The Engine Room)
The backend is the invisible workhorse that handles all the heavy lifting, coordinates the AI models, and manages your files.
- **What it is:** FastAPI (Python).
- **Why we use it:** Python is the undisputed king of AI programming. FastAPI makes it incredibly fast and easy to connect our frontend interface to our AI models.
- **How it works:** It constantly listens for requests from the frontend (like "process this PDF" or "answer this question"). It then orchestrates the different AI models to get the job done and sends the results back to your screen in real-time.

### 3. The AI Models (The Brains)
SASI.AI uses specialized, open-source AI models that run directly on your computer's hardware.
- **The Thinking Brain (LLM):** We use **Mistral** (via a tool called **Ollama**). This is the AI that actually reads text and formulates intelligent answers.
- **The Reading Brain (Embeddings):** We use **Nomic-Embed-Text**. This converts human text into math (vectors) so the AI can quickly search through hundreds of pages of a PDF to find the exact paragraph needed.
- **The Listening Brain (Speech-to-Text):** We use **OpenAI Whisper (Local version)**. It listens to your microphone and perfectly transcribes your spoken words into text.
- **The Speaking Brain (Text-to-Speech):** We use local Text-to-Speech (TTS) models to read the AI's written answers out loud to you.

### 4. The Memory (The Database)
- **What it is:** ChromaDB.
- **Why we use it:** Traditional databases search for exact words. ChromaDB searches for *meaning*. 
- **How it works:** When you upload a PDF, the text is broken down into small chunks and stored here. When you ask a question, ChromaDB instantly finds the most relevant chunks of text based on the *concept* of your question, not just the keywords.

---

## 🧠 The Secret Sauce: How It Reads Your Documents (RAG)

How does the AI know about a document you just uploaded if it wasn't trained on it? It uses a technique called **RAG (Retrieval-Augmented Generation)**.

Here is the step-by-step journey of a question:
1. **Ingestion:** You upload a PDF. SASI.AI reads the text, chops it into bite-sized pieces, and stores them in its memory (ChromaDB).
2. **Retrieval:** You ask, "What is the penalty for early termination in this contract?" The system searches the database and grabs only the paragraphs that mention penalties and terminations.
3. **Prompting:** The backend bundles your question AND those specific paragraphs together. It essentially tells the AI: *"Using ONLY the following text, answer the user's question."*
4. **Generation:** The AI (Mistral) reads those specific paragraphs and generates a precise, hallucination-free answer.

---

## 🗂️ How Workspaces Stay Separate

SASI.AI lets you open multiple "Workspaces." 
- **How:** Every time you create a new workspace, the system assigns it a unique secret ID (like `workspace-123`).
- **Why:** When you upload a document or ask a question, it is tagged with that specific ID. 
- **The Result:** If you are in Workspace A, the AI is physically restricted to only looking at files tagged with Workspace A's ID. It is impossible for it to accidentally mix up information from your private diary in Workspace B with your work documents in Workspace A.

---

## 📦 How It Becomes a Desktop App

Normally, running AI models, Python servers, and React interfaces requires a developer to type complex commands into a terminal. We fixed that.

- **What we use:** Electron and PyInstaller.
- **How it works:** 
  1. We take all the complicated Python AI code and bundle it into a single invisible program (`VoiceDoc.exe`).
  2. We take the React frontend and wrap it in a native desktop window using **Electron**.
  3. When you double-click the SASI.AI icon, the app silently starts the Python AI server in the background. Once the server is ready, the beautiful user interface appears on your screen. When you close the window, everything shuts down cleanly.

This gives you the immense power of a full-scale AI architecture, packaged into a simple, double-clickable app that anyone can use!
