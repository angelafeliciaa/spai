import os
from typing import Optional

from ollama import chat
from ollama import ChatResponse

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from llm.llama import text_gen
from dotenv import load_dotenv

from supabase import create_client, Client

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI()

allowed_origins = ["*"]
app.add_middleware(CORSMiddleware, allow_origins=allowed_origins,
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

user_states = {}

class ChatRequest(BaseModel):
    user_id: str
    text: str

class ChatResponse(BaseModel):
    response: str

@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest):
    user_id = req.user_id
    user_text = req.text.strip() if req.text else ""

    state = user_states.get(user_id, {"step": 0, "team_name": None})
    return ChatResponse(response="How can I help you today?")

    # # Ask for team name
    # if state["step"] == 0:
    #     user_states[user_id]["step"] = 1
    #     return ChatResponse(response="What's your team name?")
    # elif state["step"] == 1:
    #     team_name = user_text
    #     user_states[user_id]["team_name"] = team_name
    #     user_states[user_id]["step"] = 2

    #     result = supabase.table("teams").select("*").eq("name", team_name).execute()
    #     if not result.data:
    #         supabase.table("teams").insert({"name": team_name}).execute()

    #     # Reply that we stored the name, and ask how to help
    #     return ChatResponse(response=f"How can I help you?")
    # else:
    #     if not user_text:
    #         return ChatResponse(response="How can I help you today?")

    #     answer = text_gen(user_text)
    #     return ChatResponse(response=answer)

if __name__ == '__main__':
    print(text_gen("hello, what's your name"))