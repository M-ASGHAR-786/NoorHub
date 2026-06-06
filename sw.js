/**
 * NoorHub - PWA Service Worker
 * Handles network-first strategy for development/production synchronization
 * with cache fallbacks for offline execution.
 */

const CACHE_NAME = 'noorhub-cache-v10';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './practice.html',
  './calendar.html',
  './act-detail.html',
  './css/custom.css',
  './js/calendar.js',
  './js/counter.js',
  './js/practice.js',
  './assets/audio/Click.wav',
  './assets/audio/Complete.mp3',
  './assets/audio/Select.wav',
  './icons/favicon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './manifest.json'
];

// Installation event: cache all vital application assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activation event: clean up legacy cache namespaces and claim active pages immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event: Network-First Strategy to ensure code updates persist across navigations
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});