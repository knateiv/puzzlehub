/* Service worker: lưu toàn bộ file để chơi offline.
   Chiến lược "mạng trước": có mạng thì luôn lấy bản mới nhất (và cập nhật bộ nhớ đệm),
   mất mạng thì dùng bản đã lưu. */
var CACHE = 'puzzlehub-v15';
var FILES = [
  './', './index.html', './style.css', './manifest.webmanifest',
  './assets/splash.jpg',
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

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
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
