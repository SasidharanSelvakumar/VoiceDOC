"""
Retrieval-Augmented Generation (RAG) module.

This area is the brain of the assistant, connecting our local data to the Ollama LLM.

How it works:
1. Takes the document chunks (from document.py) and converts them into embeddings 
   using a local embedding model.
2. Stores these embeddings in a local vector database (ChromaDB).
3. When a user asks a question, it retrieves the most relevant chunks from ChromaDB.
4. It passes both the context (chunks) and the user's question to the local Ollama LLM 
   (via LangChain) to generate an accurate, context-aware answer.
"""

from langchain_community.chat_models import ChatOllama
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import PromptTemplate
from langchain_classic.chains import ConversationalRetrievalChain
from core.memory import MemoryManager

class RAGPipeline:
    """
    The core RAG pipeline connecting ChromaDB, Ollama embeddings, and the Ollama LLM.
    """
    
    def __init__(self):
        """
        Initializes the Embeddings, Vector Store, and Memory Manager.
        """
        # Use HuggingFace CPU embeddings so it's fast for everyone and doesn't require Ollama
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
        # Connect to the local Chroma vector store
        self.vector_store = Chroma(
            collection_name="voicedoc_collection_v2", # v2 avoids dimension mismatch with old nomic embeddings
            persist_directory="chroma_db", 
            embedding_function=self.embeddings,
            collection_metadata={"hnsw:space": "cosine"}
        )

        self.memory_manager = MemoryManager()
        
    def get_llm(self, engine_type: str, api_key: str = None):
        if engine_type == "cloud":
            import os
            actual_key = api_key or os.environ.get("GROQ_API_KEY")
            if actual_key:
                return ChatGroq(model_name="llama-3.1-8b-instant", api_key=actual_key)
            else:
                return ChatOllama(model="mistral") # Fallback
        else:
            return ChatOllama(model="mistral")
        
    def get_chain(self, session_id: str, engine_type: str = "local", api_key: str = None):
        llm = self.get_llm(engine_type, api_key)
        
        # Create a retriever specifically filtered for this session's documents
        retriever = self.vector_store.as_retriever(
            search_kwargs={
                "k": 6, 
                "filter": {"session_id": session_id}
            }
        )
        
        # Create and return a new chain per request to avoid cross-user state leaks
        return ConversationalRetrievalChain.from_llm(
            llm=llm,
            retriever=retriever,
            memory=self.memory_manager.get_memory(session_id),
            return_source_documents=True,
            verbose=True
        )
        
    def ask_question(self, question: str, session_id: str, engine_type: str = "local", api_key: str = None) -> dict:
        """
        Executes the Conversational Retrieval Chain to answer a user's question.
        
        Args:
            question (str): The user's question.
            session_id (str): A unique identifier for the user session to retrieve memory.
            
        Returns:
            dict: The generated text answer and source documents.
        """
        try:
            chain = self.get_chain(session_id, engine_type, api_key)
            response = chain.invoke({"question": question})
            return response

        except Exception as e:
            print(f"Error during retrieval: {e}")
            return {"answer": "I encountered an error connecting to the AI engine.", "source_documents": []}

    async def ask_question_stream(self, question: str, session_id: str, engine_type: str = "local", api_key: str = None):
        """
        Executes the Conversational Retrieval Chain and streams the response.
        """
        try:
            chain = self.get_chain(session_id, engine_type, api_key)
            async for chunk in chain.astream({"question": question}):
                yield chunk

        except Exception as e:
            print(f"Error during retrieval: {e}")
            yield {"answer": "I encountered an error connecting to the AI engine.", "source_documents": []}