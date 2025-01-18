import os
from dotenv import load_dotenv
import transformers
import torch
from huggingface_hub import login

load_dotenv()

HUGGINGFACE_TOKEN = os.getenv("HUGGINGFACE_TOKEN")
login(token=HUGGINGFACE_TOKEN)

model_id = "meta-llama/Llama-3.1-8B"

text_generator = transformers.pipeline(
    "text-generation",
    model=model_id,
    model_kwargs={"torch_dtype": torch.bfloat16},
    device_map="auto"
)

if __name__ == "__main__":
    response = text_generator("Hey, how are you doing today?")
    print(response[0]["generated_text"])