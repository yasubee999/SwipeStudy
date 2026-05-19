#!/usr/bin/env python3
"""SwipeWords local server — serves files and appends quiz results to CSV."""

import csv
import http.server
import json
import os
import socket
import sys

RESULTS_FILE = 'results.csv'
PORT = int(os.environ.get('PORT', 8000))
HEADERS = ['日付', '時刻', '問題CSV', '単語', '正答', 'ユーザの解答', '成否', '回答時間(秒)']


def local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return 'localhost'


class Handler(http.server.SimpleHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        if self.path != '/save-result':
            self.send_response(404)
            self.end_headers()
            return

        length = int(self.headers.get('Content-Length', 0))
        try:
            data = json.loads(self.rfile.read(length))
            self._append(data)
            self.send_response(200)
            self._cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(str(e).encode())

    def _append(self, data):
        new_file = not os.path.exists(RESULTS_FILE) or os.path.getsize(RESULTS_FILE) == 0
        with open(RESULTS_FILE, 'a', newline='', encoding='utf-8-sig') as f:
            w = csv.writer(f)
            if new_file:
                w.writerow(HEADERS)
            w.writerow([
                data.get('date', ''),
                data.get('time', ''),
                data.get('csvFileName', ''),
                data.get('word', ''),
                data.get('correct', ''),
                data.get('userAnswer', ''),
                data.get('pass', ''),
                data.get('elapsed', ''),
            ])

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def log_message(self, fmt, *args):
        # 静的ファイルのログは抑制、結果保存のみ表示
        if '/save-result' in str(args[0] if args else ''):
            print(f'[保存] {args}')


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    ip = local_ip()
    with http.server.HTTPServer(('', PORT), Handler) as httpd:
        print(f'SwipeWords サーバー起動')
        print(f'  PC:      http://localhost:{PORT}/SwipeWords.html')
        print(f'  スマホ:  http://{ip}:{PORT}/SwipeWords.html')
        print(f'  結果CSV: {os.path.abspath(RESULTS_FILE)}')
        print('  終了: Ctrl+C')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nサーバー停止')
            sys.exit(0)
