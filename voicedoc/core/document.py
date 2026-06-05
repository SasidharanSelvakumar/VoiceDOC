"""
Document processing module.

This area is responsible for taking raw files (like PDFs or text files) and 
preparing them for the RAG pipeline.

How it works:
1. Loaders (like LangChain's PyPDFLoader) extract text from files.
2. Text Splitters break the large text into smaller, manageable chunks.
3. These chunks are later passed to the vector database to be embedded.
"""

import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

class DocumentProcessor:
    """
    Handles loading, chunking, and embedding documents for the RAG pipeline.
    """
    
    def __init__(self, persist_directory: str = "chroma_db"):
        """
        Initialize the DocumentProcessor.
        
        Args:
            persist_directory (str): The local directory to store the Chroma vector database.
        """
        self.persist_directory = persist_directory
        # Use HuggingFace CPU embeddings to match the RAG pipeline
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
    def process_document(self, file_path: str, session_id: str):
        """
        Processes a single PDF document: loads, chunks, and stores embeddings.
        
        Args:
            file_path (str): The path to the PDF file to process.
            session_id (str): The unique session identifier for this document.
            
        Returns:
            Chroma: The Chroma vector store instance containing the document embeddings.
            
        Raises:
            FileNotFoundError: If the specified PDF file does not exist.
        """
        print(f"Starting processing for: {file_path}")
        
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Error: The file '{file_path}' was not found.")
            
        try:
            # 1. Load the PDF
            print("Step 1: Loading PDF...")
            loader = PyPDFLoader(file_path)
            documents = loader.load()
            print(f"Loaded {len(documents)} pages.")
            
            # 2. Chunk the text (UPDATED SETTINGS FOR BETTER CONTEXT)
            print("Step 2: Chunking text...")
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=800,      # Smaller chunks to reduce noise
                chunk_overlap=150,   
                length_function=len,
                separators=["\n\n", "\n", ".", " ", ""] 
            )
            chunks = text_splitter.split_documents(documents)
            
            # Attach session_id to metadata
            for chunk in chunks:
                chunk.metadata["session_id"] = session_id
                
            print(f"Created {len(chunks)} chunks.")
            
            # 3. Create and persist embeddings in vector store
            print("Step 3: Generating embeddings and saving to Chroma...")
            vectorstore = Chroma.from_documents(
                collection_name="voicedoc_collection_v2",
                documents=chunks,
                embedding=self.embeddings,
                persist_directory=self.persist_directory,
                collection_metadata={"hnsw:space": "cosine"} # Use cosine similarity for reliable scores
            )
            print("Successfully processed and saved to vector store.")
            
            return vectorstore
            
        except Exception as e:
            print(f"An error occurred during document processing: {e}")
            return None

if __name__ == "__main__":
    processor = DocumentProcessor()
    test_file = "test_doc.pdf"
    
    if os.path.exists(test_file):
        processor.process_document(test_file)
    else:
        print(f"Warning: Please place a '{test_file}' in the directory to test the DocumentProcessor.")