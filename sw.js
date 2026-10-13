/* Service worker: lưu toàn bộ file vào bộ nhớ đệm để chơi offline sau lần mở đầu tiên. */
var CACHE = 'puzzlehub-v1';
var FILES = [
  './', './index.html', './style.css', './manifest.webmanifest',
  './js/core.js', './js/ui.js', './js/main.js',
  './js/games/blockblast.js', './js/games/tictactoe.js', './js/games/oneline.js',
  './js/games/watersort.js', './js/games/fruitmerge.js', './js/games/whack.js',
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
  e.respondWith(caches.match(e.request).then(function (hit) {
    return hit || fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () { return caches.match('./index.html'); });
  }));
});
