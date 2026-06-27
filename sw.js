const CACHE_NAME = 'iptv-lite-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-192-maskable.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(SHELL_FILES);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);

  // Only manage same-origin GET requests for the app shell itself.
  // Everything else (Xtream API calls, stream URLs on a different
  // host/port, POSTs, etc.) is left completely untouched so live TV
  // and login traffic always goes straight to the network.
  var isShellFile = SHELL_FILES.some(function (f) {
    return url.pathname.endsWith(f.replace('./', '/')) || url.pathname.endsWith('/');
  });

  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !isShellFile) {
    return; // do not call respondWith - default network behavior applies
  }

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      return cached || fetch(event.request).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
        return resp;
      });
    }).catch(function () {
      return caches.match('./index.html');
    })
  );
});
