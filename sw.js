const CACHE_NAME = 'awa-calc-v4';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Only cache index.html – it always exists.
      return cache.add('/index.html');
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
    caches.match(event.request).then(response => {
      // If the request is for the root, return index.html from cache
      if (event.request.url === self.location.origin + '/' || event.request.url === self.location.origin + '/index.html') {
        return response || fetch('/index.html');
      }
      return response || fetch(event.request);
    })
  );
});
