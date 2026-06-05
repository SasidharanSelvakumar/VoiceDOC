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
        
    def load_history(self, session_id: str, db_messages: list):
        """Loads a list of message dicts (from DB) into the memory if it's fresh."""
        memory = self.get_memory(session_id)
        if len(memory.chat_memory.messages) == 0:
            for msg in db_messages:
                if msg["role"] == "user":
                    memory.chat_memory.add_user_message(msg["content"])
                elif msg["role"] == "ai":
                    memory.chat_memory.add_ai_message(msg["content"])
        
    def clear_memory(self, session_id: str):
        if session_id in self.memories:
            self.memories[session_id].clear()
