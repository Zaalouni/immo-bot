const CACHE = 'luxbot-v2'; // bumped — purge l'ancien cache v1
const STATIC = [
  '/immo-bot/luxbot/',
  '/immo-bot/luxbot/index.html',
  '/immo-bot/luxbot/deals.html',
  '/immo-bot/luxbot/activites.html',
  '/immo-bot/luxbot/mamer.html',
  '/immo-bot/luxbot/stats.html',
  '/immo-bot/luxbot/assets/style.css',
  '/immo-bot/luxbot/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Supprime TOUS les anciens caches (y compris luxbot-v1 qui cachait des 404)
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // JSON / iCal data : network-first, cache seulement si succès (2xx)
  if (url.pathname.includes('/data/') &&
      (url.pathname.endsWith('.json') || url.pathname.endsWith('.ics'))) {
    e.respondWith(
      fetch(e.request).then(r => {
        if (r.ok) {
          // Ne mettre en cache que les réponses OK (pas les 404)
          caches.open(CACHE).then(c => c.put(e.request, r.clone()));
        }
        return r;
      }).catch(() =>
        // Réseau KO : essayer le cache, sinon réponse 503 propre
        caches.match(e.request).then(cached =>
          cached || new Response('{}', {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          })
        )
      )
    );
    return;
  }

  // Assets statiques : cache-first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
