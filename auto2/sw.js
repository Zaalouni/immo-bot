/* Service Worker — Auto-Bot Luxembourg
   Rôle : mise en cache des ressources statiques pour fonctionnement offline.
   Stratégie : Network First pour les pages HTML et les données JS (toujours la dernière
   version en ligne), Cache First uniquement pour les librairies CDN figées par version.
   Scope : /immo-bot/auto2/
*/
const CACHE_NAME = 'autobot-lu-v8';

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

  /* Ignorer tout ce qui n'est pas HTTP/HTTPS (chrome-extension://, etc.) */
  if (!url.startsWith('http')) return;

  /* Ignorer les requêtes cross-origin qui ne sont pas des assets du site */
  if (!url.includes('zaalouni.github.io') && !url.includes('cdn.jsdelivr.net') && !url.includes('cdn.datatables.net') && !url.includes('code.jquery.com')) return;

  /* Données dynamiques (listings.js, deals.js...) → Network First */
  const isHtmlPage = event.request.mode === 'navigate' || url.endsWith('.html') || url.includes('.html?');

  /* Tous les fichiers du site lui-même (HTML, data/*.js, fiab.js…) → Network First ;
     seules les librairies CDN versionnées restent en Cache First (sinon un script
     local comme fiab.js restait figé après mise à jour). */
  const isOwnAsset = url.includes('zaalouni.github.io');

  if (DATA_PATTERNS.some(p => url.includes(p)) || isHtmlPage || isOwnAsset) {
    /* Pages HTML + données : toujours tenter le réseau d'abord pour ne jamais
       servir une version figée après une mise à jour du dashboard. Le cache
       ne sert que de secours hors-ligne. */
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

  /* Librairies CDN figées par version (chart.js@4.4.0, bootstrap@5.3.0...) → Cache First */
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
