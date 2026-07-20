const CACHE_NAME = 'awa-calc-v6';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/screenshot-desktop.png',
  '/screenshot-mobile.png'
];

// Install event – cache essential assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache).catch(err => {
        console.warn('Some files failed to cache:', err);
        // Continue anyway – don't let one failure break the install
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate event – clean up old caches
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

// Fetch event – try network first, fall back to cache
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // If we got a valid response, clone and cache it for offline use
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          // Only cache GET requests for same-origin or simple assets
          if (event.request.method === 'GET' && event.request.url.startsWith(self.location.origin)) {
            cache.put(event.request, responseClone);
          }
        });
        return response;
      })
      .catch(() => {
        // Network failed – fall back to cache
        return caches.match(event.request);
      })
  );
});
