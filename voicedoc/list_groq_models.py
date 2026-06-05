import os
from groq import Groq

client = Groq(api_key=os.environ.get("GROQ_API_KEY", "your-groq-api-key"))
models = client.models.list()
print("Available Models:")
for m in models.data:
    print(m.id)
