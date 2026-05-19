import os
import json
import urllib.request
import csv
import time
import re

api_key = os.environ.get('GOOGLE_API_KEY')
if not api_key:
    print("No GOOGLE_API_KEY found")
    exit(1)

# url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}'
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
    
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req) as response:
                result = json.loads(response.read().decode('utf-8'))
                text = result['candidates'][0]['content']['parts'][0]['text']
                # Sometimes the model still outputs markdown like ```json ... ```
                text = re.sub(r'^```json', '', text)
                text = re.sub(r'```$', '', text)
                return json.loads(text.strip())
        except Exception as e:
            print(f"Error on attempt {attempt+1}: {e}")
            time.sleep(2)
    return {}

input_path = "ターゲット１４００（５訂）.csv"
output_path = "ターゲット１４００（５訂）_精査後.csv"

# Load original data
with open(input_path, 'r', encoding='utf-8-sig', errors='replace') as infile:
    reader = csv.reader(infile)
    rows = list(reader)

all_words = []
# 1列目の単語リストを作成
for row in rows:
    if not row or not row[0].strip():
        continue
    all_words.append(row[0].strip())

chunk_size = 50
translation_dict = {}

print(f"Translating {len(all_words)} words...")
for i in range(0, len(all_words), chunk_size):
    chunk = all_words[i:i+chunk_size]
    print(f"Processing {i+1} to {min(i+chunk_size, len(all_words))}...")
    result_dict = get_translations_from_gemini(chunk)
    # 結合する
    translation_dict.update(result_dict)
    time.sleep(1) # a bit of delay to avoid rate limits

print("Translation mapping complete. Writing to file...")

with open(output_path, 'w', encoding='utf-8-sig', newline='') as outfile:
    writer = csv.writer(outfile)
    for row in rows:
        if not row:
            continue
        word = row[0].strip()
        trans = translation_dict.get(word, "")
        
        # 2カラム目が空欄や明らかに誤っている場合は3カラム目を空にするか、AIの訳を採用するか。
        # ユーザー指示:
        # 「２カラムが空欄や意味のない文字列になっている場合も、３カラム目を２カラム目を無視して生成してください。」
        # AIが訳を生成するので、そのままtransを使えば良い。
        
        # フォーマットを揃える
        new_row = row[:2]
        while len(new_row) < 2:
            new_row.append("")
        new_row.append(trans)
        writer.writerow(new_row)

print("All done. Output written to:", output_path)
