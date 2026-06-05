import sys
from core.rag import RAGPipeline
import asyncio

async def test():
    try:
        rag = RAGPipeline()
        # Note: update_engine is removed in the refactored version.
        # Just passing the test parameters directly to get_chain.
        print("Engine updated. Getting chain...")
        chain = rag.get_chain("test_session", engine_type="cloud", api_key="your-api-key")
        print("Engine updated. Getting chain...")
        chain = rag.get_chain("test_session")
        print("Chain created. Invoking...")
        async for chunk in chain.astream({"question": "Hello"}):
            print(chunk)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
