const CACHE = 'luxbot-v1';
const STATIC = [
  '/immo-bot/luxbot/',
  '/immo-bot/luxbot/index.html',
  '/immo-bot/luxbot/deals.html',
  '/immo-bot/luxbot/activites.html',
  '/immo-bot/luxbot/stats.html',
  '/immo-bot/luxbot/assets/style.css',
  '/immo-bot/luxbot/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // JSON data : network-first (fraîcheur), fallback cache
  if (url.pathname.includes('/data/') && url.pathname.endsWith('.json')) {
    e.respondWith(
      fetch(e.request).then(r => {
        const clone = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return r;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  // Static assets : cache-first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
