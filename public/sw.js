const CACHE_NAME = 'rentflow-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let network handle by default, fall back to cache when offline
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
