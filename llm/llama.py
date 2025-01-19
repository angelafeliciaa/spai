import os
from dotenv import load_dotenv
import transformers
import torch
from huggingface_hub import login

model_id = "meta-llama/Llama-3.1-8B"

text_generator = transformers.pipeline(
    "text-generation",
    model=model_id,
    model_kwargs={"torch_dtype": torch.float16},
    device_map="auto"
)

def text_gen(input):
    response = text_generator(input)
    return response[0]["generated_text"]

