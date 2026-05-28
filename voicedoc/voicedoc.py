"""
Main entry point for the VoiceDoc application.

This file orchestrates the entire Text-In / Voice-Out terminal application.
It ties together:
1. Document ingestion and processing (core.document)
2. The RAG pipeline and Ollama LLM integration (core.rag)
3. Conversation memory (core.memory)
4. Text-to-Speech generation and playback (voice.tts)

Future implementation here will likely contain the main interaction loop 
where the user inputs text queries in the terminal and receives audio responses.
"""

import sys
import uuid
from rich.console import Console
from rich.markdown import Markdown

from core.document import DocumentProcessor
from core.rag import RAGPipeline
from voice.tts import VoiceSpeaker

def main():
    console = Console()
    
    # Print welcome banner
    console.print("\n[bold cyan]🎙️ VoiceDoc - Local AI Assistant[/bold cyan]\n")
    
    # Prompt for the PDF file to analyze
    file_name = console.input("[bold cyan]Enter the name of the PDF file to analyze:[/bold cyan] ").strip()
    
    # Process the document
    processor = DocumentProcessor()
    vectorstore = processor.process_document(file_name)
    
    if vectorstore is None:
        console.print("[bold red]Failed to process the document. Exiting...[/bold red]")
        sys.exit(1)
        
    console.print("[bold green]Document processed successfully![/bold green]\n")
    
    # Initialize the RAG pipeline and speaker
    rag = RAGPipeline()
    speaker = VoiceSpeaker()
    
    # Generate a unique session ID for memory tracking
    session_id = str(uuid.uuid4())
    
    console.print("[bold cyan]VoiceDoc is ready! Type 'quit' or 'exit' to end the session.[/bold cyan]")
    
    # The Chat Loop
    while True:
        try:
            user_input = console.input("\n[bold green]You:[/bold green] ").strip()
            
            if user_input.lower() in ['quit', 'exit']:
                console.print("[bold cyan]Goodbye! Have a great day.[/bold cyan]")
                break
                
            if not user_input:
                continue
                
            # Get the answer from the RAG pipeline with a spinner
            with console.status("[bold yellow]Thinking...[/bold yellow]"):
                answer = rag.ask_question(user_input, session_id)
                
            # Print the final answer beautifully formatted as Markdown
            console.print("\n[bold magenta]VoiceDoc:[/bold magenta]")
            console.print(Markdown(answer))
            
            # Speak the answer out loud
            speaker.speak(answer)
            
        except KeyboardInterrupt:
            console.print("\n[bold cyan]Goodbye! Have a great day.[/bold cyan]")
            break
        except Exception as e:
            console.print(f"\n[bold red]An unexpected error occurred: {e}[/bold red]")

if __name__ == "__main__":
    main()
