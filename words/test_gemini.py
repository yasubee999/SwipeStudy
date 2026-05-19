import os
import json
import urllib.request
import re

api_key = os.environ.get('GOOGLE_API_KEY')
url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}'

def test_gemini():
    prompt = """You are a translation assistant creating a high school English vocabulary list.
Please provide the *single* most common, simple Japanese translation for each of the following english words.
- ONLY output a raw JSON dictionary without markdown codeblocks or descriptions.
- The output format must be EXACTLY: {"word": "translation"}
- Do NOT include leading particles like 助詞 (を, に, が, と, で, から). E.g. "agree" -> "賛成する" (NOT "に賛成する"). "work" -> "働く". "consider" -> "考慮する".
- If the original column 2 gives a specific nuance, it's fine, but just give the most standard high school level translation.

Words:
believe
consider
expect
decide
allow
"""
    data = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"response_mime_type": "application/json", "temperature": 0.1}
    }

    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            text = result['candidates'][0]['content']['parts'][0]['text']
            print("Raw text:", text)
            print("Parsed text:", json.loads(text))
    except Exception as e:
        print("Error:", e)

test_gemini()
