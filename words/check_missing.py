import csv
with open('ターゲット１４００（５訂）_精査後.csv', 'r', encoding='utf-8-sig', errors='replace') as infile:
    rows = list(csv.reader(infile))
missing = [r[0] for r in rows if r and r[0].strip() and (len(r) < 3 or not r[2].strip())]
print(f'Total missing: {len(missing)}')
if missing:
    print('First 10 missing:', missing[:10])
