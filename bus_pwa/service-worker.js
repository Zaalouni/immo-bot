/* ============================================================
   Service Worker — bus-offline-v26
   Cache-first assets · Network-first data · Periodic Sync alerts
   ============================================================ */

const CACHE_NAME = 'bus-offline-v26';
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
  './assets/icon-maskable-192.png',
  './assets/icon-maskable-512.png',
];

const DATA_ASSETS = [
  './data/bus-schedules.js',
  './data/bus-schedules.json',
];

/* ===== Constantes alertes ===== */
const MORNING_START   = 7 * 60 + 15;
const MORNING_END     = 8 * 60 + 15;
const AFTERNOON_START = 16 * 60;       /* 16:00 — rappel avant heure de pointe */
const AFTERNOON_END   = 17 * 60 + 30; /* 17:30 */
const EVENING_START   = 17 * 60 + 40;
const EVENING_END     = 19 * 60;

/* Arrets matin : depart vers la ville */
const STOPS_MORNING = ['MAMER, Gare', 'MAMER, Mambra', 'MAMER, Eglantiers'];
/* Arrets soir : depart depuis la ville / connexion.
   AVL 10 : Quai 2 = sens Steinsel → Bertrange (vers Belle-Étoile). */
const STOPS_EVENING = [
  'LUXEMBOURG, Gare Centrale',
  'Gare Centrale Quai 2', 'Hamilius Quai 2', 'Strassen, Bourmicht Quai 2',
  'BERTRANGE, Belle-Etoile',
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
      .then(pruneNotifCache)
      .then(() => self.clients.claim())
  );
});

/* Purge les entrees anti-doublon de plus de 3 jours (sinon NOTIF_CACHE
   grossit indefiniment, une entree par fenetre/jour). */
async function pruneNotifCache() {
  const cache  = await caches.open(NOTIF_CACHE);
  const keys   = await cache.keys();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 3);
  const cutoffStr = fmtDate(cutoff);
  await Promise.all(keys.map(req => {
    const m = req.url.match(/(\d{4}-\d{2}-\d{2})$/);
    if (m && m[1] < cutoffStr) return cache.delete(req);
  }));
}

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
    /* Stale-while-revalidate : sert le cache instantanement (le bouton
       "Verifier les mises a jour" de l'app gere deja le cas "nouvelles
       donnees disponibles" explicitement), et rafraichit le cache en tache
       de fond. Avant, le fetch reseau bloquait chaque chargement de
       bus-schedules.js (~1.5 Mo) meme quand le cache etait deja a jour. */
    event.respondWith((async () => {
      const cached = await caches.match(event.request);
      const networkUpdate = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
        }
        return response;
      }).catch(() => null);
      if (cached) {
        event.waitUntil(networkUpdate);
        return cached;
      }
      return (await networkUpdate) || new Response('', { status: 408, statusText: 'Offline' });
    })());
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
  const tag = event.notification.tag;
  const tab = tag === 'bus-morning' ? 'morning' : tag === 'bus-afternoon' ? 'evening' : 'evening';
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

/* ===== Jour de service (aligne sur app.js) ===== */
const pad2 = n => String(n).padStart(2, '0');
const fmtDate = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function easterSunday(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}
const _holidayCache = {};
function luxHolidays(year) {
  if (_holidayCache[year]) return _holidayCache[year];
  const easter = easterSunday(year);
  const shift = days => { const x = new Date(easter); x.setDate(x.getDate() + days); return x; };
  const map = {
    [fmtDate(new Date(year, 0, 1))]: 1, [fmtDate(shift(1))]: 1,
    [fmtDate(new Date(year, 4, 1))]: 1, [fmtDate(new Date(year, 4, 9))]: 1,
    [fmtDate(shift(39))]: 1, [fmtDate(shift(50))]: 1,
    [fmtDate(new Date(year, 5, 23))]: 1, [fmtDate(new Date(year, 7, 15))]: 1,
    [fmtDate(new Date(year, 10, 1))]: 1, [fmtDate(new Date(year, 11, 25))]: 1,
    [fmtDate(new Date(year, 11, 26))]: 1,
  };
  _holidayCache[year] = map;
  return map;
}
const isHoliday = date => !!luxHolidays(date.getFullYear())[fmtDate(date)];

function dayCodeFor(date) {
  if (isHoliday(date)) return 'sun';
  const d = date.getDay();
  if (d === 0) return 'sun';
  if (d === 6) return 'sat';
  return 'weekday';
}
function isServiceDay(svc, code) {
  if (!svc || svc === ')') return true;
  const s = svc.toLowerCase();
  if (code === 'weekday') {
    /* Tout label commencant par samedi/dimanche ne circule pas en semaine */
    if (/^samedi/.test(s))   return false;
    if (/^dimanche/.test(s)) return false;
    return true;
  }
  if (code === 'sat') return /samedi|lu.sa|lundi.vendredi.*samedi/.test(s);
  return /dimanche|f.ri|samedis.*dimanches|samedi.*dimanche/.test(s);
}

/* ===== Logique de notification ===== */
async function checkAndNotify() {
  const now      = new Date();
  const totalMin = now.getHours() * 60 + now.getMinutes();
  const isMorning   = totalMin >= MORNING_START   && totalMin <= MORNING_END;
  const isAfternoon = totalMin >= AFTERNOON_START  && totalMin <= AFTERNOON_END;
  const isEvening   = totalMin >= EVENING_START    && totalMin <= EVENING_END;
  if (!isMorning && !isAfternoon && !isEvening) return;

  /* Anti-doublon : une seule notification par fenetre par jour */
  const today    = now.toISOString().slice(0, 10);
  const window   = isMorning ? 'morning' : isAfternoon ? 'afternoon' : 'evening';
  const stateKey = window + '-' + today;
  const nc       = await caches.open(NOTIF_CACHE);
  if (await nc.match(stateKey)) return;
  await nc.put(stateKey, new Response('1'));

  const schedules = await loadSchedules();
  if (!schedules) return;

  /* Ne garder que les courses qui circulent aujourd'hui (jour de service + feries) */
  const code = dayCodeFor(now);
  const todaySchedules = schedules.filter(r => isServiceDay(r.service_label, code));

  if (isMorning)   await showMorningAlert(todaySchedules, totalMin);
  else if (isAfternoon) await showAfternoonAlert(todaySchedules, totalMin);
  else             await showEveningAlert(todaySchedules, totalMin);
}

async function loadSchedules() {
  try {
    const cache = await caches.open(CACHE_NAME);
    /* Preferer le JSON (plus propre a parser dans le SW) */
    const resp  = await cache.match('./data/bus-schedules.json')
                  || await fetch('./data/bus-schedules.json');
    const data  = await resp.json();
    return data.schedules || [];
  } catch (e) {
    console.error('[SW] Impossible de charger les horaires :', e);
    return null;
  }
}

function nextDepartures(schedules, stops, minNow, count) {
  return schedules
    .filter(r => stops.includes(r.target_stop))
    .filter(r => {
      const d = r.time_minutes - minNow;
      const wrapped = Math.min(Math.abs(d), 1440 - Math.abs(d));
      return d >= -5 && wrapped <= 90;
    })
    /* Tri chronologique : les fenetres d'alerte (matin/soir) ne franchissent
       jamais minuit, donc l'ordre des heures = ordre des departs (les bus
       juste passes restent en tete, ce qui est le comportement attendu). */
    .sort((a, b) => a.time_minutes - b.time_minutes)
    .slice(0, count);
}

function formatDep(r, minNow) {
  const diff = r.time_minutes - minNow;
  const when = diff <= 1 ? 'maintenant' : 'dans ' + diff + ' min';
  const network = r.network === 'CFL' ? 'Train ' + r.course : r.network + ' ' + r.line;
  return network + ' ' + r.time + ' (' + when + ')';
}

/* Construit et affiche une alerte (matin/apres-midi/soir) : memes etapes
   (selection des prochains departs, separation train/bus, corps du
   message), seuls le titre/tag/stops/vibration/onglet cible changent. */
async function showAlert(schedules, minNow, opts) {
  const deps = nextDepartures(schedules, opts.stops, minNow, opts.count);
  if (!deps.length) return;

  const trains = deps.filter(r => r.network === 'CFL');
  const buses  = deps.filter(r => r.network !== 'CFL');

  let body = '';
  if (trains.length) body += '🚆 ' + trains.map(r => formatDep(r, minNow)).join(' · ') + '\n';
  if (buses.length)  body += '🚌 ' + buses.map(r => formatDep(r, minNow)).join(' · ');

  await self.registration.showNotification(opts.title, {
    body:   body.trim() || deps.map(r => formatDep(r, minNow)).join('\n'),
    icon:   './assets/icon-192.png',
    badge:  './assets/icon-192.png',
    tag:    opts.tag,
    renotify: false,
    vibrate: opts.vibrate,
    data:   { tab: opts.tab },
  });
}

const showMorningAlert = (schedules, minNow) => showAlert(schedules, minNow, {
  stops: STOPS_MORNING, count: 4, tab: 'morning', tag: 'bus-morning',
  title: '🌅 Alerte matin — Mamer → Luxembourg', vibrate: [200, 100, 200],
});

/* Prévenir l'utilisateur en ville ~1h avant l'heure de pointe soir */
const showAfternoonAlert = (schedules, minNow) => showAlert(schedules, minNow, {
  stops: STOPS_EVENING, count: 3, tab: 'evening', tag: 'bus-afternoon',
  title: '🌤️ Prépare ton départ — Luxembourg → Mamer', vibrate: [100, 50, 100],
});

const showEveningAlert = (schedules, minNow) => showAlert(schedules, minNow, {
  stops: STOPS_EVENING, count: 4, tab: 'evening', tag: 'bus-evening',
  title: '🌆 Alerte soir — Luxembourg → Mamer', vibrate: [200, 100, 200],
});
