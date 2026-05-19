import os
import json
import urllib.request
import urllib.error

api_key = os.environ.get('GOOGLE_API_KEY')
if not api_key:
    print("No GOOGLE_API_KEY found")
    exit(1)

url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}'

data = {
    "contents": [{
        "parts": [{"text": "Translate the word 'work' to Japanese as a single most common verb without particles. Example format: JSON {\"work\": \"働く\"}"}]
    }],
    "generationConfig": {"response_mime_type": "application/json"}
}

req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode('utf-8'))
        text = result['candidates'][0]['content']['parts'][0]['text']
        print(text)
except urllib.error.HTTPError as e:
    print("HTTPError:", e.code, e.reason)
    print(e.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
