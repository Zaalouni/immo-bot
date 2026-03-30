/* Service Worker — Auto-Bot Luxembourg
   Rôle : mise en cache des ressources statiques pour fonctionnement offline.
   Stratégie : Cache First pour les assets, Network First pour les données JS.
   Scope : /immo-bot/auto2/
*/
const CACHE_NAME = 'autobot-lu-v2';

/* Assets statiques mis en cache au premier chargement (chemins relatifs au scope) */
const STATIC_ASSETS = [
  './index.html',
  './deals.html',
  './rapport.html',
  './watchlist.html',
  './market.html',
  './compare.html',
  './budget.html',
  './top-models.html',
];

/* Données dynamiques : toujours essayer le réseau d'abord */
const DATA_PATTERNS = ['/data/', '/immo-bot/auto2/data/'];

/* ── Installation : mise en cache initiale ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Ignorer les erreurs si les fichiers ne sont pas encore disponibles
      });
    })
  );
  self.skipWaiting();
});

/* ── Activation : nettoyage des anciens caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* ── Fetch : stratégie selon le type de ressource ── */
self.addEventListener('fetch', event => {
  const url = event.request.url;

  /* Données dynamiques (listings.js, deals.js...) → Network First */
  if (DATA_PATTERNS.some(p => url.includes(p))) {
    event.respondWith(
      fetch(event.request)
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return resp;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  /* Ressources statiques → Cache First */
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return resp;
      });
    })
  );
});
