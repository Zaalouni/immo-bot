/* ============================================================
   Service Worker — bus-offline-v2
   Cache-first pour les assets statiques
   Network-first pour les données (bus-schedules.js/.json)
   ============================================================ */

const CACHE_NAME = 'bus-offline-v2';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './service-worker.js',
  './assets/app.css',
  './assets/app.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
];

const DATA_ASSETS = [
  './data/bus-schedules.js',
  './data/bus-schedules.json',
];

/* ===== Install : pré-cache tout ===== */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll([...STATIC_ASSETS, ...DATA_ASSETS]))
      .then(() => self.skipWaiting())
  );
});

/* ===== Activate : nettoyer les anciens caches ===== */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ===== Message SKIP_WAITING (mise à jour à chaud) ===== */
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

/* ===== Fetch ===== */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url    = new URL(event.request.url);
  const isData = DATA_ASSETS.some(d => url.pathname.endsWith(d.replace('./', '/')));

  if (isData) {
    /* Network-first pour les données */
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    /* Cache-first pour les assets statiques */
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200 || response.type === 'opaque') return response;
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            return response;
          })
          .catch(() => {
            /* Fallback offline : retourner index.html pour les navigations document */
            if (event.request.destination === 'document') return caches.match('./index.html');
            return new Response('', { status: 408, statusText: 'Offline' });
          });
      })
    );
  }
});
