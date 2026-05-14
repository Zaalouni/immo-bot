/* ============================================================
   Service Worker — bus-offline-v9
   Cache-first assets · Network-first data · Periodic Sync alerts
   ============================================================ */

const CACHE_NAME = 'bus-offline-v9';
const NOTIF_CACHE = 'bus-notif-state-v1';

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

/* ===== Constantes alertes ===== */
const MORNING_START = 7 * 60 + 15;
const MORNING_END   = 8 * 60 + 15;
const EVENING_START = 17 * 60 + 40;
const EVENING_END   = 19 * 60;

/* Arrets matin : depart vers la ville */
const STOPS_MORNING = ['MAMER, Gare', 'MAMER, Mambra', 'MAMER, Eglantiers'];
/* Arrets soir : depart depuis la ville / connexion */
const STOPS_EVENING = [
  'LUXEMBOURG, Gare Centrale',
  'Gare Centrale Quai 1', 'Hamilius Quai 1', 'Strassen, Bourmicht Quai 1',
  'BERTRANGE, Belle-Etoile', 'Bertrange, Belle Étoile Quai 1',
];

/* ===== Install ===== */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll([...STATIC_ASSETS, ...DATA_ASSETS]))
      .then(() => self.skipWaiting())
  );
});

/* ===== Activate ===== */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== NOTIF_CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ===== Message SKIP_WAITING ===== */
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

/* ===== Fetch ===== */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url    = new URL(event.request.url);
  const isData = DATA_ASSETS.some(d => url.pathname.endsWith(d.replace('./', '/')));

  if (isData) {
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
            if (event.request.destination === 'document') return caches.match('./index.html');
            return new Response('', { status: 408, statusText: 'Offline' });
          });
      })
    );
  }
});

/* ===== Periodic Background Sync ===== */
self.addEventListener('periodicsync', event => {
  if (event.tag === 'bus-alert') {
    event.waitUntil(checkAndNotify());
  }
});

/* ===== Notification click → ouvre l'app ===== */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const tab = event.notification.tag === 'bus-morning' ? 'morning' : 'evening';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes('bus_pwa') && 'focus' in client) {
          client.postMessage({ type: 'OPEN_TAB', tab });
          return client.focus();
        }
      }
      return self.clients.openWindow('./index.html?tab=' + tab);
    })
  );
});

/* ===== Logique de notification ===== */
async function checkAndNotify() {
  const now     = new Date();
  const totalMin = now.getHours() * 60 + now.getMinutes();
  const isMorning = totalMin >= MORNING_START && totalMin <= MORNING_END;
  const isEvening = totalMin >= EVENING_START && totalMin <= EVENING_END;
  if (!isMorning && !isEvening) return;

  /* Anti-doublon : une seule notification par fenetre par jour */
  const today  = now.toISOString().slice(0, 10);
  const stateKey = (isMorning ? 'morning-' : 'evening-') + today;
  const nc     = await caches.open(NOTIF_CACHE);
  if (await nc.match(stateKey)) return;
  await nc.put(stateKey, new Response('1'));

  const schedules = await loadSchedules();
  if (!schedules) return;

  if (isMorning) await showMorningAlert(schedules, totalMin);
  else           await showEveningAlert(schedules, totalMin);
}

async function loadSchedules() {
  try {
    const cache = await caches.open(CACHE_NAME);
    /* Preferer le JSON (plus propre a parser dans le SW) */
    const resp  = await cache.match('./data/bus-schedules.json')
                  || await fetch('./data/bus-schedules.json');
    const data  = await resp.json();
    return data.schedules || [];
  } catch (_) { return null; }
}

function nextDepartures(schedules, stops, minNow, count) {
  return schedules
    .filter(r => stops.includes(r.target_stop))
    .filter(r => {
      const d = r.time_minutes - minNow;
      const wrapped = Math.min(Math.abs(d), 1440 - Math.abs(d));
      return d >= -5 && wrapped <= 90;
    })
    .sort((a, b) => {
      const da = (a.time_minutes - minNow + 1440) % 1440;
      const db = (b.time_minutes - minNow + 1440) % 1440;
      return da - db;
    })
    .slice(0, count);
}

function formatDep(r, minNow) {
  const diff = r.time_minutes - minNow;
  const when = diff <= 1 ? 'maintenant' : 'dans ' + diff + ' min';
  const network = r.network === 'CFL' ? 'Train ' + r.course : r.network + ' ' + r.line;
  return network + ' ' + r.time + ' (' + when + ')';
}

async function showMorningAlert(schedules, minNow) {
  const deps = nextDepartures(schedules, STOPS_MORNING, minNow, 4);
  if (!deps.length) return;

  /* Separer train et bus */
  const trains = deps.filter(r => r.network === 'CFL');
  const buses  = deps.filter(r => r.network !== 'CFL');

  let body = '';
  if (trains.length) body += '🚆 ' + trains.map(r => formatDep(r, minNow)).join(' · ') + '\n';
  if (buses.length)  body += '🚌 ' + buses.map(r => formatDep(r, minNow)).join(' · ');

  await self.registration.showNotification('🌅 Alerte matin — Mamer → Luxembourg', {
    body:   body.trim() || deps.map(r => formatDep(r, minNow)).join('\n'),
    icon:   './assets/icon-192.png',
    badge:  './assets/icon-192.png',
    tag:    'bus-morning',
    renotify: false,
    vibrate: [200, 100, 200],
    data:   { tab: 'morning' },
  });
}

async function showEveningAlert(schedules, minNow) {
  const deps = nextDepartures(schedules, STOPS_EVENING, minNow, 4);
  if (!deps.length) return;

  const trains = deps.filter(r => r.network === 'CFL');
  const buses  = deps.filter(r => r.network !== 'CFL');

  let body = '';
  if (trains.length) body += '🚆 ' + trains.map(r => formatDep(r, minNow)).join(' · ') + '\n';
  if (buses.length)  body += '🚌 ' + buses.map(r => formatDep(r, minNow)).join(' · ');

  await self.registration.showNotification('🌆 Alerte soir — Luxembourg → Mamer', {
    body:   body.trim() || deps.map(r => formatDep(r, minNow)).join('\n'),
    icon:   './assets/icon-192.png',
    badge:  './assets/icon-192.png',
    tag:    'bus-evening',
    renotify: false,
    vibrate: [200, 100, 200],
    data:   { tab: 'evening' },
  });
}
