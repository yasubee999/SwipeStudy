import csv
import re

def clean_translation(text):
    if not text or not text.strip():
        return ""
        
    if not re.search(r'[ぁ-んァ-ン一-龥]', text):
        return ""
        
    # カッコとその中身を最初に全削除する（セミコロン等で分割する前に実行しないと、カッコ内のセミコロンで分割されてしまう）
    s = re.sub(r'[（\(〔【［].*?[）\)〕】］]', '', text)
    
    # 意味の固まりを分割
    meanings = re.split(r'[；;]', s)
    if not meanings:
        return ""
    
    def finalize_item(item):
        item = item.strip()
        # 先頭の助詞や記号を削除
        item = re.sub(r'^[をにがとでからはの]+', '', item)
        # 再度トリム
        return item.strip()
        
    # カンマ等でさらに分割して最初の有効な日本語を抽出
    for m in meanings:
        sub_meanings = re.split(r'[，、,]', m)
        for sub in sub_meanings:
            cleaned = finalize_item(sub)
            if cleaned and re.search(r'[ぁ-んァ-ン一-龥]', cleaned):
                return cleaned
                
    return ""

input_path = "ターゲット１４００（５訂）.csv"
output_path = "ターゲット１４００（５訂）_精査後.csv"

with open(input_path, 'r', encoding='utf-8-sig', errors='replace') as infile:
    reader = csv.reader(infile)
    rows = list(reader)

with open(output_path, 'w', encoding='utf-8-sig', newline='') as outfile:
    writer = csv.writer(outfile)
    for row in rows:
        if not row:
            continue
        translation_raw = row[1] if len(row) > 1 else ""
        polished = clean_translation(translation_raw)
        
        new_row = row[:2]
        while len(new_row) < 2:
            new_row.append("")
        new_row.append(polished)
        writer.writerow(new_row)

print("Processing complete. Output saved to:", output_path)
