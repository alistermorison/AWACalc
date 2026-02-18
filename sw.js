// Service Worker for AWA Calculator PWA
const CACHE_NAME = 'awa-calculator-v1.2';
const STATIC_CACHE = 'static-cache-v1';
const DYNAMIC_CACHE = 'dynamic-cache-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/logo.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  const cacheWhitelist = [STATIC_CACHE, DYNAMIC_CACHE];
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheWhitelist.includes(cacheName)) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip chrome-extension requests
  if (request.url.startsWith('chrome-extension://')) return;
  
  // Skip analytics/telemetry requests
  if (request.url.includes('analytics') || request.url.includes('telemetry')) {
    return;
  }
  
  // For navigation requests, try network first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the response for future navigation
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then((cache) => {
              cache.put(request, responseClone);
            });
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // If not in cache, return offline page or index.html
              return caches.match('/index.html');
            });
        })
    );
    return;
  }
  
  // For static assets (CSS, JS, images), try cache first
  if (request.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Update cache in background
            fetch(request)
              .then((response) => {
                const responseClone = response.clone();
                caches.open(DYNAMIC_CACHE)
                  .then((cache) => {
                    cache.put(request, responseClone);
                  });
              })
              .catch(() => {
                // Silently fail background update
              });
            return cachedResponse;
          }
          
          // Not in cache, fetch from network
          return fetch(request)
            .then((response) => {
              // Cache the response
              const responseClone = response.clone();
              caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  cache.put(request, responseClone);
                });
              return response;
            })
            .catch((error) => {
              console.error('[Service Worker] Fetch failed:', error);
              // Return a fallback for images
              if (request.url.match(/\.(png|jpg|jpeg|gif|ico|svg)$/)) {
                return new Response(
                  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24"><path fill="#cccccc" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
                  { headers: { 'Content-Type': 'image/svg+xml' } }
                );
              }
              throw error;
            });
        })
    );
    return;
  }
  
  // For API/data requests, try network first
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then((cache) => {
              cache.put(request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(request);
      })
  );
});

// Background sync for offline calculations
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-calculations') {
    event.waitUntil(syncCalculations());
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received');
  
  const options = {
    body: event.data ? event.data.text() : 'New update available for AWA Calculator',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('AWA Calculator', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click:', event.notification);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If a window is already open, focus it
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Periodic background updates
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-check') {
    console.log('[Service Worker] Periodic sync for updates');
    event.waitUntil(checkForUpdates());
  }
});

// Helper functions
async function syncCalculations() {
  // This would sync any offline calculations when back online
  console.log('[Service Worker] Syncing calculations...');
  // Implementation would depend on your backend
}

async function checkForUpdates() {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const response = await fetch('/index.html', { cache: 'no-store' });
    
    if (response.status === 200) {
      const cachedResponse = await cache.match('/index.html');
      
      if (!cachedResponse) return;
      
      const cachedText = await cachedResponse.text();
      const freshText = await response.text();
      
      if (cachedText !== freshText) {
        // New version available
        self.registration.showNotification('AWA Calculator Update', {
          body: 'A new version is available. Refresh to update.',
          icon: '/icon-192x192.png',
          tag: 'update-available'
        });
      }
    }
  } catch (error) {
    console.error('[Service Worker] Update check failed:', error);
  }
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_DATA') {
    // Cache calculation data
    caches.open(DYNAMIC_CACHE)
      .then((cache) => {
        cache.put('/api/calculation-data', new Response(JSON.stringify(event.data.payload)));
      });
  }
});

// Error reporting
self.addEventListener('error', (event) => {
  console.error('[Service Worker] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[Service Worker] Unhandled rejection:', event.reason);
});