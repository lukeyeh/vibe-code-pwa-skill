// Network first, cache as the offline fallback: a reload always shows the
// latest files when online, so there is no stale cache to fight during
// development.
//
// Every file the app needs offline must be listed in SHELL. One missing file
// fails the whole install, and the app then never works offline.
const CACHE = 'app-v1';
const SHELL = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'manifest.json',
  'icon-180.png',
  'icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    // 'no-cache' revalidates with the server, so the browser's own HTTP cache
    // cannot serve an old copy either.
    fetch(request, { cache: 'no-cache' })
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true })),
  );
});
