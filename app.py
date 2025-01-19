import os
import time
from typing import Optional

from ollama import chat
# from ollama import ChatResponse

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from llm.llama import ask_question, summarize
from dotenv import load_dotenv

from supabase import create_client, Client

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

user_states = {}

class ChatRequest(BaseModel):
    user_id: str
    text: str
    history: str

class ChatResponse(BaseModel):
    response: str

def clear_user_states():
    user_states = {}

def store_summary(user_id: str, summary: str):
    try:
        response = supabase.table("user_interactions") \
            .update({"conversation_summary": summary}) \
            .eq("user_id", user_id.lower()) \
            .execute()
        print(response)
        
        if response.error:
            print(f"Error updating summary for user_id={user_id}: {response.error}")
        else:
            print(f"Summary updated for user_id={user_id}")
            
    except Exception as e:
        print(f"Error in store_summary: {str(e)}")
        return None

@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest):
    user_id = req.user_id.lower()
    user_text = req.text.strip() if req.text else ""
    user_history = req.history.strip() if req.history else ""

    state = user_states.get(user_id)
    if not state:
        state = {
            "last_timestamp": time.time(),
            "history": []
        }
        user_states[user_id] = state

    current_time = time.time()
    elapsed = current_time - state["last_timestamp"]
    state["last_timestamp"] = current_time
    state["history"].append(user_text)

    if elapsed > 10 and len(state["history"]) > 1:
        if state["history"]:
            summary_prompt = ""
            for idx, question in enumerate(state["history"], start=1):
                summary_prompt += f"{idx}. {question}\n"
            summary_answer = summarize(user_history, summary_prompt)

            store_summary(user_id, summary_answer)
            clear_user_states()
        return ChatResponse(response='')
    else:
        llm_response = ask_question(user_text)
        return ChatResponse(response=llm_response)

if __name__ == '__main__':
    print(ask_question("hello, what's your name"))
