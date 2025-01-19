from ollama import chat, ChatResponse
from llm.pronpts import summary_user, summary_system

def ask_question(input):
    response: ChatResponse = chat(
        model='llama3.2',
        messages=[
            {
                'role': 'system',
                'content': 'You are a street photographer. Have a conversation with someone you meet at the hackathon.'
            },
            {
                'role': 'user',
                'content': input,
            },
        ])
    return response['message']['content']

def summarize(logs):
    user_input = summary_user.format(CURRENT_LOGS=logs)
    response = chat(
        model='llama3.2',
        messages=[
            {
                'role': 'system',
                'content': summary_system.strip()
            },
            {
                'role': 'user',
                'content': user_input.strip(),
            },
        ]
    )
    return response['message']['content']
