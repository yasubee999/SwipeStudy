import os
import json
import urllib.request

api_key = os.environ.get('GOOGLE_API_KEY')
url = f'https://generativelanguage.googleapis.com/v1beta/models?key={api_key}'
try:
    with urllib.request.urlopen(url) as response:
        result = json.loads(response.read().decode('utf-8'))
        print([m['name'] for m in result['models'] if 'flash' in m['name'] or 'pro' in m['name']])
except Exception as e:
    print(e)
