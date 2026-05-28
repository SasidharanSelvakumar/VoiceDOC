from langchain_classic.memory import ConversationBufferMemory

class MemoryManager:
    def __init__(self):
        # This will hold the memory for each active session
        self.memories = {}

    def get_memory(self, session_id: str):
        if session_id not in self.memories:
            self.memories[session_id] = ConversationBufferMemory(
                memory_key="chat_history",
                return_messages=True,
                output_key="answer"
            )
        return self.memories[session_id]
        
    def clear_memory(self, session_id: str):
        if session_id in self.memories:
            self.memories[session_id].clear()
