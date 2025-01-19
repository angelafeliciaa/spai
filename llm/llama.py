from ollama import chat
from ollama import ChatResponse


def text_gen(input):
    response: ChatResponse = chat(model='llama3.2', messages=[
    {
        'role': 'user',
        'content': input,
    },
    ])
    return response['message']['content']

