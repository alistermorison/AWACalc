const CACHE_NAME = 'awa-calc-v5';

self.addEventListener('install', event => {
  // Activate immediately – do NOT cache anything during install.
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Network‑first: always try to fetch from network.
  // Only fall back to cache if network fails.
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
