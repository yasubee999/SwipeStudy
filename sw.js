const CACHE = 'swipewords-v128';
const ASSETS = [
  'SwipeWords.html', 'manifest.json', 'icon.svg', 'vocab_sample.csv',
  // 単語帳リスト
  'words/index.json',
  // 単語帳CSV（wordsフォルダ）
  'words/%E3%82%BF%E3%83%BC%E3%82%B2%E3%83%83%E3%83%88%EF%BC%91%EF%BC%94%EF%BC%90%EF%BC%90%EF%BC%88%EF%BC%95%E8%A8%82%EF%BC%89_%E7%B2%BE%E6%9F%BB%E5%BE%8C.csv',
  'words/%E5%8D%98%E8%AA%9E1600%E5%9F%BA%E6%9C%AC%E7%B7%A81-400%E7%B2%BE%E6%9F%BB.csv',
  'words/Database4800%E3%83%AC%E3%83%99%E3%83%AB1.csv',
  'words/Database4800%E3%83%AC%E3%83%99%E3%83%AB1%E7%86%9F%E8%AA%9E.csv',
  'words/Database4800%E3%83%AC%E3%83%99%E3%83%AB2.csv',
  'words/%E8%8B%B1%E6%A4%9C4%E7%B4%9A.csv',
  // combo sounds（追加した場合はここにも追記）
  'sound/good1.wav', 'sound/good2.wav',
  'sound/nice1.wav', 'sound/nice2.wav',
  'sound/fire1.wav', 'sound/fire2.mp3',
  'sound/unstoppable1.wav', 'sound/unstoppable2.wav', 'sound/unstoppable3.wav',
  'sound/unstoppable4.wav', 'sound/unstoppable5.wav', 'sound/unstoppable6.wav',
  'sound/unstoppable7.wav', 'sound/unstoppable8.wav', 'sound/unstoppable9.wav',
  'sound/boo01.mp3',
  'sound/ok1.mp3',
];

self.addEventListener('install', e => {
  // HTTPキャッシュを無視して常に最新ファイルを取得
  e.waitUntil(
    caches.open(CACHE).then(c =>
      c.addAll(ASSETS.map(url => new Request(url, { cache: 'no-cache' })))
    )
  );
  // skipWaiting はページからのメッセージで行う
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request))
  );
});
