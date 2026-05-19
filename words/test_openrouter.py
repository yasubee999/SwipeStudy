import os
import json
import urllib.request
import csv
import time

api_key = os.environ.get('OPENROUTER_API_KEY')

url = "https://openrouter.ai/api/v1/chat/completions"

def get_translations_from_openrouter(words):
    prompt = """You are a Japanese translation assistant. 
For each English word below, provide ONLY ONE most common, simple Japanese translation.
NO particles like を, に, が. Examples:
work -> 働く
believe -> 信じる
consider -> 考慮する

Words:
""" + ", ".join(words)

    data = {
        "model": "google/gemini-2.5-flash", # Let's see if OpenRouter supports it or we can fallback to meta-llama/llama-3.3-70b-instruct
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"}
    }

    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    })
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            print(result['choices'][0]['message']['content'])
    except Exception as e:
        print("Error:", e)
        if hasattr(e, 'read'):
            print(e.read().decode('utf-8'))

get_translations_from_openrouter(['believe', 'consider', 'expect', 'decide', 'allow', 'work'])
