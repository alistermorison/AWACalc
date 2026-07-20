const CACHE_NAME = 'awa-calc-v4';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Try to cache the root, but don't fail if it errors
        return cache.add('/').catch(err => {
          console.warn('Failed to cache /, but continuing:', err);
        });
      })
      .then(() => {
        // Ensure the service worker activates even if caching failed
        self.skipWaiting();
      })
  );
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
    .then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
      .catch(() => {
        // Fallback: if both cache and network fail, return a simple response
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      })
  );
});
