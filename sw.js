/* Service worker: lưu toàn bộ file để chơi offline.
   Chiến lược "mạng trước": có mạng thì luôn lấy bản mới nhất (và cập nhật bộ nhớ đệm),
   mất mạng thì dùng bản đã lưu. */
var CACHE = 'puzzlehub-v21';
var FILES = [
  './', './index.html', './style.css', './manifest.webmanifest',
  './assets/splash.jpg',
  './assets/bgm.mp3',
  './js/core.js', './js/ui.js', './js/main.js',
  './js/games/blockblast.js', './js/games/tictactoe.js', './js/games/oneline.js',
  './js/games/watersort.js', './js/games/fruitmerge.js', './js/games/whack.js',
  './js/games/sudoku.js', './js/games/onet.js', './js/games/mahjong.js', './js/games/blockslide.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function handleRange(req, res) {
  var range = req.headers.get('range');
  if (!range) return res;
  return res.arrayBuffer().then(function (buf) {
    var total = buf.byteLength;
    var parts = range.replace(/bytes=/, '').split('-');
    var start = parseInt(parts[0], 10) || 0;
    var end = parts[1] ? parseInt(parts[1], 10) : total - 1;
    if (start >= total || end >= total) {
      return new Response(null, {
        status: 416,
        headers: { 'Content-Range': 'bytes */' + total }
      });
    }
    var chunk = buf.slice(start, end + 1);
    return new Response(chunk, {
      status: 206,
      statusText: 'Partial Content',
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
        'Content-Length': chunk.byteLength,
        'Accept-Ranges': 'bytes'
      }
    });
  });
}

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = e.request.url;
  var isAudio = url.indexOf('bgm.mp3') !== -1;

  if (isAudio) {
    e.respondWith(
      caches.match('./assets/bgm.mp3').then(function (cached) {
        if (cached) return handleRange(e.request, cached);
        return fetch(e.request).then(function (res) {
          if (res && (res.status === 200 || res.status === 206)) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put('./assets/bgm.mp3', copy); });
          }
          return res;
        });
      })
    );
    return;
  }

  e.respondWith(fetch(e.request).then(function (res) {
    if (res && res.ok) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
    }
    return res;
  }).catch(function () {
    return caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
      return hit || caches.match('./index.html');
    });
  }));
});
