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
from langchain_community.embeddings import OllamaEmbeddings
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
        Initializes the LLM, Embeddings, Vector Store, and Memory Manager.
        """
        # Initialize the Chat model strictly using llama3
        self.llm = ChatOllama(model="mistral")
        
        # Initialize Embeddings strictly using nomic-embed-text
        self.embeddings = OllamaEmbeddings(model="nomic-embed-text")
        
        # Connect to the local Chroma vector store
        # Connect to the local Chroma vector store
        self.vector_store = Chroma(
            collection_name="voicedoc_collection",
            persist_directory="chroma_db", 
            embedding_function=self.embeddings,
            collection_metadata={"hnsw:space": "cosine"}
        )
        

        self.memory_manager = MemoryManager()
        self.chains = {} # Maps session_id to its specific chain
        
    def get_chain(self, session_id: str):
        if session_id not in self.chains:
            # Create a retriever specifically filtered for this session's documents
            retriever = self.vector_store.as_retriever(
                search_kwargs={
                    "k": 6, 
                    "filter": {"session_id": session_id}
                }
            )
            
            # Create the Conversational Chain for this specific session
            self.chains[session_id] = ConversationalRetrievalChain.from_llm(
                llm=self.llm,
                retriever=retriever,
                memory=self.memory_manager.get_memory(session_id),
                return_source_documents=True,
                verbose=True
            )
            
        return self.chains[session_id]
        
    def ask_question(self, question: str, session_id: str) -> dict:
        """
        Executes the Conversational Retrieval Chain to answer a user's question.
        
        Args:
            question (str): The user's question.
            session_id (str): A unique identifier for the user session to retrieve memory.
            
        Returns:
            dict: The generated text answer and source documents.
        """
        try:
            chain = self.get_chain(session_id)
            response = chain.invoke({"question": question})
            return response

        except Exception as e:
            print(f"Error during retrieval: {e}")
            return {"answer": "I encountered an error connecting to the AI engine.", "source_documents": []}

    async def ask_question_stream(self, question: str, session_id: str):
        """
        Executes the Conversational Retrieval Chain and streams the response.
        """
        try:
            chain = self.get_chain(session_id)
            async for chunk in chain.astream({"question": question}):
                yield chunk

        except Exception as e:
            print(f"Error during retrieval: {e}")
            yield {"answer": "I encountered an error connecting to the AI engine.", "source_documents": []}