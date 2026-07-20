const CACHE_NAME = 'awa-calc-v7';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/screenshot-desktop.png',
  '/screenshot-mobile.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Try to cache each URL individually – skip failures
      for (const url of urlsToCache) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
            console.log(`Cached: ${url}`);
          } else {
            console.warn(`Failed to cache ${url}: status ${response.status}`);
          }
        } catch (err) {
          console.warn(`Error caching ${url}:`, err);
        }
      }
    })
  );
  self.skipWaiting();
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
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses for future offline use
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          if (event.request.method === 'GET' && response.ok) {
            cache.put(event.request, clone);
          }
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
