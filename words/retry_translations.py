import os
import json
import urllib.request
import csv
import time
import re

api_key = os.environ.get('GOOGLE_API_KEY')

url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}'

def get_translations_from_gemini(words):
    prompt = """You are a translation assistant creating a high school English vocabulary list.
Please provide the *single* most common, simple Japanese translation for each of the following english words.
- ONLY output a raw JSON dictionary without markdown codeblocks or descriptions.
- The output format must be EXACTLY: {"word": "translation"}
- Do NOT include leading particles like 助詞 (を, に, が, と, で, から). E.g. "agree" -> "賛成する" (NOT "に賛成する"). "work" -> "働く". "consider" -> "考慮する".
- If the original column 2 gives a specific nuance, it's fine, but just give the most standard high school level translation.

Words:
""" + "\n".join(words)

    data = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.1
        }
    }

    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req) as response:
                result = json.loads(response.read().decode('utf-8'))
                text = result['candidates'][0]['content']['parts'][0]['text']
                text = re.sub(r'^```json', '', text)
                text = re.sub(r'```$', '', text)
                return json.loads(text.strip())
        except Exception as e:
            print(f"Error on attempt {attempt+1}: {e}")
            if "429" in str(e):
                time.sleep(15) # Wait longer on 429
            else:
                time.sleep(2)
    return {}

file_path = "ターゲット１４００（５訂）_精査後.csv"

# Load current data
with open(file_path, 'r', encoding='utf-8-sig', errors='replace') as infile:
    reader = csv.reader(infile)
    rows = list(reader)

words_to_translate = []
# 3カラム目が空欄の単語をリストアップ（またはエラーで空欄になった単語）
for row in rows:
    if not row or not row[0].strip():
        continue
    # If len(row) < 3 or it's empty string
    if len(row) < 3 or not row[2].strip():
        words_to_translate.append(row[0].strip())

if not words_to_translate:
    print("All words already translated.")
    exit(0)

chunk_size = 50
translation_dict = {}

print(f"Translating {len(words_to_translate)} remaining words...")
for i in range(0, len(words_to_translate), chunk_size):
    chunk = words_to_translate[i:i+chunk_size]
    print(f"Processing {i+1} to {min(i+chunk_size, len(words_to_translate))}...")
    result_dict = get_translations_from_gemini(chunk)
    translation_dict.update(result_dict)
    time.sleep(4)

print("Translation mapping complete. Updating file...")

for row in rows:
    if not row or not row[0].strip():
        continue
    word = row[0].strip()
    if word in translation_dict and translation_dict[word]:
        while len(row) < 3:
            row.append("")
        row[2] = translation_dict[word]

with open(file_path, 'w', encoding='utf-8-sig', newline='') as outfile:
    writer = csv.writer(outfile)
    writer.writerows(rows)

print("All done. Output updated in:", file_path)
