/* ============================================================
   BUS OFFLINE -- Application principale
   ============================================================ */
(() => {
  'use strict';

  /* ===== Donnees ===== */
  const DATA = window.BUS_SCHEDULES || { metadata: {}, schedules: [] };
  const ALL = (DATA.schedules || [])
    .slice()
    .sort((a, b) => a.time_minutes - b.time_minutes || a.line.localeCompare(b.line));

  const $ = id => document.getElementById(id);

  if (!ALL.length) {
    $('results').innerHTML = emptyHtml('Aucune donnee', 'Le fichier bus-schedules.js est introuvable ou vide.', '🚫');
    $('resultInfo').textContent = 'Donnees manquantes';
    return;
  }

  /* ===== Utilitaires ===== */
  const netCls  = net => net === 'AVL' ? 'badge-avl' : net === 'CFL' ? 'badge-cfl' : 'badge-rgtr';
  const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
  const normalize = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const timeToMin = t => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + m; };
  const pad2 = n => String(n).padStart(2, '0');
  const minToHHMM = m => `${pad2(Math.floor((m % 1440) / 60))}:${pad2(m % 60)}`;
  const nowMin  = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const nowTime = () => { const d = new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`; };
  const unique  = arr => [...new Set(arr.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'fr'));

  /* Fenetre glissante avec passage a minuit */
  const inRange = (busMin, center, tol) => { const d = Math.abs(busMin - center); return Math.min(d, 1440 - d) <= tol; };

  function debounce(fn, ms) {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  function haptic(pattern = [30]) { if ('vibrate' in navigator) navigator.vibrate(pattern); }

  /* ===== Plages horaires ===== */
  const MORNING_START = 7 * 60 + 15;
  const MORNING_END   = 8 * 60 + 15;
  const EVENING_START = 17 * 60 + 40;
  const EVENING_END   = 19 * 60;

  /* ===== Detection direction trajet ===== */
  /* Direction -> destination = partie apres le dernier fleche */
  const dest = dir => (dir || '').split(/→|->/).pop().trim();

  /* Matin = bus qui va vers la ville (LUX, HOWALD, FINDEL, Kirchberg...)
     Belle-Etoile / Bertrange inclus : depuis Mamer, aller à Belle-Étoile
     est la 1re étape vers la ville (correspondance AVL 10). */
  const CITY_RE  = /LUX|HOWALD|FINDEL|Kirchberg|Hamilius|Gare|Steinsel|Centre|Belle[- ]Etoile|Bertrange/i;
  /* Soir = bus qui repart vers Mamer / ouest. Belle-Étoile est un terminus
     (bus 850 FINDEL→Belle-Étoile), pas une direction vers Mamer : exclu. */
  const MAMER_RE = /STEINFORT|EISCHEN|MERSCH|TUNTANGE|SCHWEBACH|REDANGE|MESSANCY|CLEMENCY/i;

  const isCityBound  = dir => CITY_RE.test(dest(dir));
  const isMamerBound = dir => MAMER_RE.test(dest(dir));

  /* ===== Coordonnees GPS des arrets ===== */
  const STOP_COORDS = {
    'MAMER, Gare':                    [49.6228, 6.0211],
    'MAMER, Mambra':                  [49.6258, 6.0253],
    'MAMER, Eglantiers':              [49.6268, 6.0198],
    'BERTRANGE, Belle-Etoile':        [49.6088, 6.1163],
    'Bertrange, Belle Étoile Quai 1': [49.6088, 6.1163],
    'Strassen, Bourmicht Quai 1':     [49.6150, 6.0870],
    'Gare Centrale Quai 1':           [49.5997, 6.1347],
    'Hamilius Quai 1':                [49.6110, 6.1297],
    'FINDEL, Aéroport Quai 4':        [49.6333, 6.2044],
    'LUXEMBOURG, Gare Centrale':      [49.5997, 6.1347],
  };

  function geoDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000, rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  function itineraryUrl(stop) {
    const coords = STOP_COORDS[stop];
    if (!coords) return null;
    const [lat, lon] = coords;
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isIOS) return `maps://maps.apple.com/?daddr=${lat},${lon}&dirflg=w`;
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=walking`;
  }

  let gpsWatchId = null;

  function detectNearestStop(opts = {}) {
    if (!('geolocation' in navigator)) {
      if (!opts.silent) showToast('GPS non disponible');
      return;
    }
    const btn = $('gpsBtn');
    if (btn) btn.classList.add('gps-detecting');
    function onPos(pos, isWatch) {
      if (!isWatch && btn) btn.classList.remove('gps-detecting');
      const { latitude: lat, longitude: lon } = pos.coords;
      let nearest = '', minDist = Infinity;
      for (const [stop, [slat, slon]] of Object.entries(STOP_COORDS)) {
        const d = geoDistance(lat, lon, slat, slon);
        if (d < minDist) { minDist = d; nearest = stop; }
      }
      if (nearest && nearest !== state.liveStop) {
        state.liveStop = nearest;
        const dist = minDist < 1000 ? Math.round(minDist) + '\xa0m' : (minDist/1000).toFixed(1) + '\xa0km';
        showToast('\u{1F4CD} ' + nearest + ' (' + dist + ')');
        applyFilters();
      } else if (nearest && !isWatch) {
        const dist = minDist < 1000 ? Math.round(minDist) + '\xa0m' : (minDist/1000).toFixed(1) + '\xa0km';
        showToast('\u{1F4CD} ' + nearest + ' (' + dist + ')');
      }
    }

    if (opts.watch) {
      if (gpsWatchId !== null) return;
      gpsWatchId = navigator.geolocation.watchPosition(
        pos => onPos(pos, true),
        () => {},
        { timeout: 10000, maximumAge: 30000, enableHighAccuracy: false }
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => onPos(pos, false),
      () => {
        if (btn) btn.classList.remove('gps-detecting');
        if (!opts.silent) showToast('Position non disponible');
      },
      { timeout: 8000, maximumAge: opts.silent ? 120000 : 30000 }
    );
  }

  /* Sous-ensembles d'arrets par role */
  const STOP_MAMER       = ['MAMER, Mambra', 'MAMER, Eglantiers'];
  const STOP_BELLE_AVL   = ['Bertrange, Belle Étoile Quai 1'];
  const STOP_CITY_AVL    = ['Strassen, Bourmicht Quai 1', 'Gare Centrale Quai 1', 'Hamilius Quai 1'];
  const STOP_BELLE_RGTR  = ['BERTRANGE, Belle-Etoile'];
  const STOP_MAMER_TRAIN = ['MAMER, Gare'];
  const STOP_LUX_TRAIN   = ['LUXEMBOURG, Gare Centrale'];

  /* Pre-calculs */
  const morningAll = ALL.filter(r => r.time_minutes >= MORNING_START && r.time_minutes <= MORNING_END);
  const eveningAll = ALL.filter(r => r.time_minutes >= EVENING_START && r.time_minutes <= EVENING_END);

  /* ===== Carte des connexions Mamer → Belle-Etoile (meme course) ===== */
  const CONNECTION_MAP = (() => {
    const byCourseMamer = new Map();
    const byCourseBert  = new Map();
    for (const r of ALL) {
      if (r.target_stop === 'MAMER, Mambra' || r.target_stop === 'MAMER, Eglantiers')
        byCourseMamer.set(r.course, r);
      if (r.target_stop === 'BERTRANGE, Belle-Etoile')
        byCourseBert.set(r.course, r);
    }
    const map = new Map();
    for (const [course, m] of byCourseMamer) {
      const b = byCourseBert.get(course);
      if (!b) continue;
      const dt = b.time_minutes - m.time_minutes;
      if (dt > 0 && dt <= 20)
        map.set(course, { mamerStop: m.target_stop, mamerMin: m.time_minutes, bertMin: b.time_minutes, line: m.line, service: m.service_label, time: m.time });
    }
    return map;
  })();

  function renderConnectionWidget(n) {
    const code  = state.dayFilter === 'all' ? null : activeDayCode();
    const avl10 = ALL.filter(r => r.target_stop === 'Bertrange, Belle \xC9toile Quai 1' && r.line === '10');
    const conns = [...CONNECTION_MAP.values()]
      .filter(c => c.mamerMin >= n - 5 && c.mamerMin <= n + 90)
      .filter(c => !code || isServiceDay(c.service, code))
      .sort((a, b) => a.mamerMin - b.mamerMin)
      .slice(0, 3);
    if (!conns.length) return '';
    const rows = conns.map(c => {
      const diff = c.mamerMin - n;
      const when = diff <= 0 ? 'maintenant' : `dans ${diff} min`;
      /* Depart pieton depuis le domicile (marge configurable via le widget Prochain bus) */
      const departMin  = c.mamerMin - state.walkMin;
      const departDiff = departMin - n;
      const departWhen = departDiff > 1 ? `dans ${departDiff} min`
                       : departDiff >= 0 ? 'maintenant'
                       : `il y a ${-departDiff} min`;
      const walkHtml = state.walkMin > 0
        ? `<span class="conn-walk">\u{1F6B6} Pars \xE0 <strong>${escapeHtml(minToHHMM(departMin))}</strong> <span class="conn-when">${escapeHtml(departWhen)}</span></span>`
        : '';
      /* Prochaine AVL 10 a Belle-Etoile apres l'arrivee du RGTR (course liee, fiable) */
      const avl  = avl10
        .filter(r => r.time_minutes >= c.bertMin + 2)
        .filter(r => !code || isServiceDay(r.service_label, code))
        .sort((a, b) => a.time_minutes - b.time_minutes)[0];
      let avlHtml;
      if (avl) {
        const wait = avl.time_minutes - c.bertMin;
        const waitCls = wait < 2 ? 'conn-tight' : wait <= 15 ? 'conn-ok' : 'conn-long';
        const waitTxt = wait < 2 ? 'correspondance serr\xE9e !' : `att. ${wait} min`;
        avlHtml = `<span class="conn-avl ${waitCls}">→ AVL 10 <strong>${escapeHtml(avl.time)}</strong> (${escapeHtml(waitTxt)})</span>`;
      } else {
        avlHtml = `<span class="conn-avl conn-miss">→ pas d'AVL 10 disponible</span>`;
      }
      return `<div class="conn-row${diff < -1 ? ' conn-past' : ''}">
        ${walkHtml}
        <span class="conn-bus"><span class="badge badge-rgtr">${escapeHtml(c.line)}</span> ${escapeHtml(c.mamerStop.replace('MAMER, ', ''))} <strong>${escapeHtml(c.time)}</strong> <span class="conn-when">${escapeHtml(when)}</span></span>
        <span class="conn-arrow">→ Belle-\xC9toile ${escapeHtml(minToHHMM(c.bertMin))}</span>
        ${avlHtml}
      </div>`;
    }).join('');
    return `<div class="conn-widget"><div class="conn-title">⚡ Connexion Mamer → Ville (porte-\xE0-porte)</div>${rows}</div>`;
  }

  /* ===== Etat ===== */
  const state = {
    tab: 'live', stop: '', line: '', direction: '', service: '',
    timeTarget: '', timeTol: 5, search: '',
    liveStop: '', liveTol: 30, ttLine: '',
    dayFilter: 'auto', walkMin: 5, goDir: 'auto',
    favorites: [],  /* [{key, line, target_stop, direction, network}] */
    history: [],
    filtered: [],
  };

  /* ===== Persistance ===== */
  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem('bus-pwa') || '{}');
      if (s.tab && ['now','morning','evening','favorites','all','live'].includes(s.tab)) state.tab = s.tab;
      if (s.stop)                                 state.stop    = s.stop;
      if (s.liveTol && [5,10,30].includes(+s.liveTol)) state.liveTol = +s.liveTol;
      if (s.dayFilter && ['auto','weekday','sat','sun','all','tomorrow'].includes(s.dayFilter)) state.dayFilter = s.dayFilter;
      if (s.walkMin   && +s.walkMin >= 0 && +s.walkMin <= 20) state.walkMin = +s.walkMin;
      if (s.goDir && ['auto','city','home'].includes(s.goDir)) state.goDir = s.goDir;
      if (Array.isArray(s.favorites)) state.favorites = s.favorites;
      if (Array.isArray(s.history))   state.history   = s.history.slice(0, 5);
    } catch (_) {}
    const urlTab = new URLSearchParams(location.search).get('tab');
    if (urlTab && ['now','morning','evening','favorites','all','live'].includes(urlTab)) state.tab = urlTab;
  }

  function saveState() {
    try { localStorage.setItem('bus-pwa', JSON.stringify({ tab: state.tab, stop: state.stop, liveTol: state.liveTol, dayFilter: state.dayFilter, walkMin: state.walkMin, goDir: state.goDir, favorites: state.favorites, history: state.history })); } catch (_) {}
  }

  /* ===== Theme ===== */
  function initTheme() { applyTheme(localStorage.getItem('bus-theme') || 'dark'); }
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const meta = $('metaThemeColor');
    if (meta) meta.content = theme === 'light' ? '#f1f5f9' : '#0a0f1e';
    localStorage.setItem('bus-theme', theme);
  }
  function toggleTheme() { applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); }

  /* ===== Jours feries Luxembourg ===== */
  const fmtDate = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  /* Dimanche de Paques — algorithme Computus gregorien (Meeus/Jones/Butcher) */
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
      [fmtDate(new Date(year, 0, 1))]:   'Nouvel An',
      [fmtDate(shift(1))]:               'Lundi de Paques',
      [fmtDate(new Date(year, 4, 1))]:   'Fete du Travail',
      [fmtDate(new Date(year, 4, 9))]:   "Journee de l'Europe",
      [fmtDate(shift(39))]:              'Ascension',
      [fmtDate(shift(50))]:              'Lundi de Pentecote',
      [fmtDate(new Date(year, 5, 23))]:  'Fete nationale',
      [fmtDate(new Date(year, 7, 15))]:  'Assomption',
      [fmtDate(new Date(year, 10, 1))]:  'Toussaint',
      [fmtDate(new Date(year, 11, 25))]: 'Noel',
      [fmtDate(new Date(year, 11, 26))]: 'Lendemain de Noel',
    };
    _holidayCache[year] = map;
    return map;
  }
  const holidayName = date => luxHolidays(date.getFullYear())[fmtDate(date)] || null;

  /* ===== Jour ===== */
  function getDayInfo() {
    const now = new Date();
    const hol = holidayName(now);
    if (hol) return { label: hol + ' (ferie)', icon: '🔴' };
    const d = now.getDay();
    if (d === 0) return { label: 'Dimanche & jours feries', icon: '🔵' };
    if (d === 6) return { label: 'Samedi',                  icon: '🟡' };
    return               { label: 'Lundi – Vendredi',   icon: '🟢' };
  }

  /* ===== Filtre jour de service ===== */
  /* Un jour ferie luxembourgeois suit le service Dimanche & feries */
  function dayCodeFor(date) {
    if (holidayName(date)) return 'sun';
    const d = date.getDay();
    if (d === 0) return 'sun';
    if (d === 6) return 'sat';
    return 'weekday';
  }
  function getAutoDay() { return dayCodeFor(new Date()); }
  function getTomorrowDay() { const t = new Date(); t.setDate(t.getDate() + 1); return dayCodeFor(t); }

  function isServiceDay(svc, code) {
    if (!svc || svc === ')') return true;
    const s = svc.toLowerCase();
    if (code === 'weekday') {
      if (/^samedis ouvrables/.test(s))    return false;
      if (/^dimanche/.test(s))             return false;
      if (/^samedis, dimanches/.test(s))   return false;
      if (/^samedi\s*\//.test(s))          return false;
      return true;
    }
    if (code === 'sat') return /samedi|lu.sa|lundi.vendredi.*samedi/.test(s);
    return /dimanche|f.ri|samedis.*dimanches|samedi.*dimanche/.test(s);
  }

  function activeDayCode() {
    if (state.dayFilter === 'auto')     return getAutoDay();
    if (state.dayFilter === 'tomorrow') return getTomorrowDay();
    return state.dayFilter;
  }

  /* Un horaire circule-t-il selon le filtre jour actif ? ('all' = pas de filtre) */
  function runsToday(r) {
    return state.dayFilter === 'all' || isServiceDay(r.service_label, activeDayCode());
  }

  /* ===== Countdown ===== */
  function countdown(diffMin) {
    const abs = Math.abs(diffMin);
    if (abs <= 1)                    return { text: 'Maintenant',          cls: 'countdown-now' };
    if (diffMin > 0 && diffMin <= 90) return { text: `dans ${diffMin} min`, cls: 'countdown-soon' };
    if (diffMin < 0 && abs <= 20)    return { text: `-${abs} min`,          cls: 'countdown-past' };
    return { text: '', cls: '' };
  }

  /* ===== Favoris ===== */
  const favKey   = r => `${r.line}|${r.target_stop}|${r.direction}`;
  const alarmKey = r => favKey(r) + '|' + r.time_minutes;
  const isFav    = r => state.favorites.some(f => f.key === favKey(r));

  function toggleFav(r) {
    const key = favKey(r);
    const idx = state.favorites.findIndex(f => f.key === key);
    if (idx >= 0) {
      state.favorites.splice(idx, 1);
    } else {
      state.favorites.unshift({ key, line: r.line, target_stop: r.target_stop, direction: r.direction, network: r.network, stop: r.stop });
    }
    saveState();
    haptic(idx >= 0 ? [30] : [50, 30, 50]);
    updateFavCount();
    /* Mettre a jour les boutons en place */
    document.querySelectorAll(`.bus-card[data-fkey] .fav-btn`).forEach(btn => {
      const card = btn.closest('.bus-card');
      if (card && card.dataset.fkey === key) {
        const added = idx < 0;
        btn.classList.toggle('is-fav', added);
        btn.title = added ? 'Retirer des favoris' : 'Ajouter aux favoris';
        btn.textContent = added ? '★' : '☆';
      }
    });
    if (state.tab === 'favorites') applyFilters();
  }

  function updateFavCount() { $('tabCountFavorites').textContent = state.favorites.length || ''; }

  /* ===== Alarmes individuelles (persistantes) ===== */
  const alarms = new Map();   /* key -> { id, rec } */
  const ALARM_LEAD = 3;       /* minutes avant le passage */

  function persistAlarms() {
    try { localStorage.setItem('bus-alarms', JSON.stringify([...alarms.values()].map(a => a.rec))); } catch (_) {}
  }

  /* Programme le timer pour un enregistrement d'alarme. Retourne false si deja passe. */
  function armAlarm(rec, opts = {}) {
    const n        = nowMin();
    const alertMin = rec.time_minutes - ALARM_LEAD;
    const diffMs   = (alertMin - n) * 60 * 1000;
    if (diffMs <= 0) return false;
    const id = setTimeout(() => {
      alarms.delete(rec.key);
      persistAlarms();
      updateAlarmBtns();
      fireNotif(
        '\u{1F514} Bus ' + rec.network + ' ' + rec.line + ' dans ' + ALARM_LEAD + ' min',
        rec.time + ' → ' + rec.direction + '\nArrêt : ' + rec.target_stop,
        'alarm-' + rec.key
      );
      haptic([200, 100, 200, 100, 400]);
    }, diffMs);
    alarms.set(rec.key, { id, rec });
    if (!opts.silent) {
      showToast('\u{1F514} Alarme dans ' + (alertMin - n) + ' min — ' + rec.network + ' ' + rec.line + ' ' + rec.time);
      haptic([50, 30, 80]);
    }
    return true;
  }

  /* Restaure au demarrage les alarmes du jour encore a venir */
  function restoreAlarms() {
    let arr = [];
    try { arr = JSON.parse(localStorage.getItem('bus-alarms') || '[]'); } catch (_) {}
    const today = fmtDate(new Date());
    for (const rec of arr) {
      if (!rec || rec.date !== today) continue;   /* alarmes d'un autre jour ignorees */
      armAlarm(rec, { silent: true });
    }
    persistAlarms();   /* purge des alarmes expirees / obsoletes */
    updateAlarmBtns();
  }

  function setAlarm(r) {
    const key = alarmKey(r);
    if (alarms.has(key)) {
      clearTimeout(alarms.get(key).id);
      alarms.delete(key);
      persistAlarms();
      showToast('Alarme annulée — ' + r.network + ' ' + r.line + ' ' + r.time);
      haptic([100, 50, 100]);
      updateAlarmBtns();
      return;
    }
    const rec = { key, line: r.line, network: r.network, target_stop: r.target_stop, direction: r.direction, time: r.time, time_minutes: r.time_minutes, date: fmtDate(new Date()) };
    if (!armAlarm(rec)) { showToast('Bus trop proche ou déjà passé'); return; }
    persistAlarms();
    updateAlarmBtns();
  }

  function updateAlarmBtns() {
    document.querySelectorAll('[data-action="alarm"]').forEach(btn => {
      const active = alarms.has(btn.dataset.akey);
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-label', active ? 'Annuler alarme' : 'Alarme');
      btn.title = active ? 'Annuler alarme' : 'Alarme 3 min avant';
    });
  }

  /* ===== Historique ===== */
  function addHistory(q) {
    if (!q || q.trim().length < 2) return;
    state.history = [q.trim(), ...state.history.filter(h => h !== q.trim())].slice(0, 5);
    saveState();
  }
  function renderHistory() {
    const el = $('searchHistory');
    if (!state.history.length) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = state.history.map(h =>
      `<div class="history-item" role="option" tabindex="0" data-q="${escapeHtml(h)}"><span class="history-icon">⏱</span><span>${escapeHtml(h)}</span></div>`
    ).join('');
  }

  /* ===== Partage ===== */
  function shareCard(r) {
    const text = `Bus ${r.line} (${r.network}) -- ${r.time} a ${r.target_stop}\nDirection : ${r.direction}\nService : ${r.service_label || 'Selon PDF'}`;
    if (navigator.share) navigator.share({ title: `Bus ${r.line} a ${r.time}`, text }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => showToast('Copie !')).catch(() => {});
  }

  /* ===== Prochain bus widget ===== */
  function updateNextBus() {
    const n = nowMin();
    /* Filtre arrêt : manuel > GPS > tous. Quand le GPS a détecté un arrêt,
       on restreint au stop GPS pour ne pas afficher un bus d'un autre arrêt
       à 5 km qui serait chronologiquement le premier de la base. */
    const effectiveStop = state.stop || state.liveStop;
    const pool = ALL.filter(r => {
      if (effectiveStop && r.target_stop !== effectiveStop) return false;
      if (state.line && r.line         !== state.line) return false;
      if (!runsToday(r)) return false;
      const diff = r.time_minutes - n;
      return diff >= -2 && diff <= 120;
    });
    const card = $('nextBusCard'), body = $('nextBusBody');
    if (!pool.length) {
      card.classList.remove('has-bus');
      body.innerHTML = '<span class="nb-no-bus">Aucun bus dans les 2 prochaines heures</span>';
      return;
    }
    const next = pool.reduce((a, b) => Math.abs(b.time_minutes - n) < Math.abs(a.time_minutes - n) ? b : a);
    const diffNext = next.time_minutes - n;
    const { text: cdText } = countdown(diffNext);
    const lineCls = netCls(next.network);
    card.classList.add('has-bus');
    body.innerHTML =
      `<div class="nb-row">` +
        `<span class="nb-time">${escapeHtml(next.time)}</span>` +
        `<span class="badge ${lineCls}">${escapeHtml(next.network)} ${escapeHtml(next.line)}</span>` +
        (cdText ? `<span class="nb-cd">${escapeHtml(cdText)}</span>` : '') +
      `</div>` +
      `<div class="nb-direction">${escapeHtml(next.direction)}</div>` +
      `<div class="nb-meta">${escapeHtml(next.target_stop)}</div>`;

    /* Barre de progression */
    const progressEl = $('nbProgress'), fillEl = $('nbProgressFill');
    if (progressEl && fillEl) {
      const pct = diffNext >= 0 && diffNext <= 90 ? Math.max(2, diffNext / 90 * 100) : 0;
      if (diffNext >= 0 && diffNext <= 90) {
        fillEl.style.width = pct + '%';
        progressEl.hidden = false;
        $('nextBusCard').classList.toggle('nb-urgent', diffNext <= 5);
      } else {
        progressEl.hidden = true;
        $('nextBusCard').classList.remove('nb-urgent');
      }
    }

    const walkDiv  = $('nextBusWalk');
    if (diffNext >= 0 && diffNext <= 90 && state.walkMin > 0) {
      const departMin  = next.time_minutes - state.walkMin;
      const departDiff = departMin - n;
      $('walkDepartTime').textContent = minToHHMM(departMin);
      $('walkDepartIn').textContent   = departDiff > 1  ? `(dans ${departDiff} min)`
                                      : departDiff >= 0 ? '(maintenant !)'
                                      : '(en retard — d\xE9p\xEAche-toi !)';
      $('walkVal').textContent = `${state.walkMin} min`;
      walkDiv.hidden = false;
    } else {
      walkDiv.hidden = true;
    }
  }

  /* ===== Widget "Rentrer / Aller en ville — maintenant" ===== */
  /* Sens auto : deduit du GPS (arret le plus proche) sinon de l'heure.
     L'utilisateur peut forcer le sens avec le bouton ⇄. */
  function computeGoTarget() {
    if (state.goDir === 'city' || state.goDir === 'home') return state.goDir;
    const ls = state.liveStop;
    if (ls) {
      if (STOP_MAMER.includes(ls) || STOP_MAMER_TRAIN.includes(ls)) return 'city';
      if (STOP_CITY_AVL.includes(ls) || STOP_LUX_TRAIN.includes(ls) ||
          STOP_BELLE_RGTR.includes(ls) || STOP_BELLE_AVL.includes(ls)) return 'home';
    }
    /* Heuristique : avant 13h on part vers la ville, ensuite on rentre. */
    return nowMin() < 13 * 60 ? 'city' : 'home';
  }

  /* Prochains departs exploitables (circulent aujourd'hui, a venir, <3h) */
  function pickGo(records, n) {
    return records
      .filter(runsToday)
      .filter(r => { const d = r.time_minutes - n; return d >= -2 && d <= 180; })
      .sort((a, b) => a.time_minutes - b.time_minutes);
  }

  function goRow(r, n, primary) {
    const diff = r.time_minutes - n;
    const { text: cd, cls: cdCls } = countdown(diff);
    const cls   = netCls(r.network);
    const icon  = r.network === 'CFL' ? '\u{1F686}' : '\u{1F68C}';
    const label = r.network === 'CFL' ? 'Train ' + escapeHtml(r.course) : escapeHtml(r.network + ' ' + r.line);
    const departMin  = r.time_minutes - state.walkMin;
    const departDiff = departMin - n;
    const walk = (primary && state.walkMin > 0)
      ? `<div class="gh-walk">\u{1F6B6} Pars \xE0 <strong>${escapeHtml(minToHHMM(departMin))}</strong> <span class="gh-walk-in">${departDiff > 1 ? `dans ${departDiff} min` : departDiff >= 0 ? 'maintenant\xA0!' : 'en retard\xA0!'}</span></div>`
      : '';
    return `<div class="gh-row ${primary ? 'gh-primary' : 'gh-alt'}">
      <div class="gh-row-top">
        <span class="gh-mode">${icon}</span>
        <span class="badge ${cls}">${label}</span>
        <span class="gh-time">${escapeHtml(r.time)}</span>
        ${cd ? `<span class="gh-cd ${cdCls}">${escapeHtml(cd)}</span>` : ''}
      </div>
      <div class="gh-dir">${escapeHtml(r.direction)}</div>
      <div class="gh-meta">${escapeHtml(r.target_stop)}</div>
      ${walk}
    </div>`;
  }

  function renderGoHome() {
    const card = $('goHomeCard');
    if (!card) return;
    const n      = nowMin();
    const target = computeGoTarget();
    let title, busPool, trainPool, note = '';
    if (target === 'city') {
      title     = '\u{1F3D9}️ Aller en ville — maintenant';
      busPool   = ALL.filter(r => STOP_MAMER.includes(r.target_stop) && isCityBound(r.direction));
      trainPool = ALL.filter(r => r.network === 'CFL' && STOP_MAMER_TRAIN.includes(r.target_stop));
    } else {
      title     = '\u{1F3E0} Rentrer \xE0 Mamer — maintenant';
      busPool   = ALL.filter(r => STOP_BELLE_RGTR.includes(r.target_stop) && isMamerBound(r.direction));
      trainPool = ALL.filter(r => r.network === 'CFL' && STOP_LUX_TRAIN.includes(r.target_stop));
      note      = 'Depuis la ville, le train L50 est l\'option directe. Le bus RGTR suppose d\'\xEAtre \xE0 Belle-\xC9toile.';
    }
    const flip = $('goHomeFlip');
    if (flip) flip.classList.toggle('gh-auto', state.goDir === 'auto');
    $('goHomeTitle').textContent = title;

    const busList   = pickGo(busPool, n);
    const trainList = pickGo(trainPool, n);
    const merged    = [...busList, ...trainList].sort((a, b) => a.time_minutes - b.time_minutes);

    if (!merged.length) {
      card.classList.remove('has-go');
      $('goHomeBody').innerHTML = `<div class="gh-empty">Aucun d\xE9part exploitable dans les 3 prochaines heures pour ce sens.</div>`;
      return;
    }
    card.classList.add('has-go');

    /* Séparer bus à venir (diff >= 0) des bus tout juste passés (diff = -2..-1) */
    const upcoming   = merged.filter(r => r.time_minutes - n >= 0);
    const recentPast = merged.filter(r => { const d = r.time_minutes - n; return d >= -2 && d < 0; });

    /* Afficher jusqu'à 4 prochains départs. Si aucun à venir, montrer
       le bus passé récent seul (pour indiquer qu'on vient de le rater). */
    const toShow = upcoming.slice(0, 4);
    if (!toShow.length) {
      $('goHomeBody').innerHTML =
        goRow(recentPast[0], n, true) +
        (note ? `<div class="gh-note">ℹ️ ${escapeHtml(note)}</div>` : '');
      return;
    }
    $('goHomeBody').innerHTML =
      toShow.map((r, i) => goRow(r, n, i === 0)).join('') +
      (note ? `<div class="gh-note">ℹ️ ${escapeHtml(note)}</div>` : '');
  }

  /* ===== Selects ===== */
  function populateSelect(el, values, allLabel) {
    const saved = el.value;
    el.innerHTML = `<option value="">${escapeHtml(allLabel)}</option>` +
      values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
    if (saved && values.includes(saved)) el.value = saved;
  }

  function updateTabCounts(n) {
    const es = state.stop || state.liveStop;
    const byStop = r => !es || r.target_stop === es;
    $('tabCountNow').textContent     = ALL.filter(r => byStop(r) && inRange(r.time_minutes, n, 5) && runsToday(r)).length || '';
    $('tabCountMorning').textContent = morningAll.filter(r => byStop(r) && runsToday(r)).length || '';
    $('tabCountEvening').textContent = eveningAll.filter(r => byStop(r) && runsToday(r)).length || '';
    updateFavCount();
  }

  /* ===== Filtrage ===== */
  function applyFilters() {
    const n      = nowMin();
    const dirNrm = normalize(state.direction);
    const txtNrm = normalize(state.search);
    const tTime  = state.timeTarget ? timeToMin(state.timeTarget) : null;
    const tol    = state.timeTol;

    let pool = state.tab === 'favorites' ? ALL.filter(r => isFav(r)) : ALL;

    const effectiveStop = state.stop || state.liveStop;
    const rows = pool.filter(r => {
      if (effectiveStop && r.target_stop !== effectiveStop) return false;
      if (state.line    && r.line          !== state.line)     return false;
      if (state.service && r.service_label !== state.service)  return false;
      if (dirNrm && !normalize(r.direction).includes(dirNrm)) return false;
      if (txtNrm) { const bag = normalize([r.stop, r.target_stop, r.direction, r.line, r.network, r.service_label].join(' ')); if (!bag.includes(txtNrm)) return false; }
      if (tTime !== null && !inRange(r.time_minutes, tTime, tol)) return false;
      if (state.tab === 'now')     { if (!inRange(r.time_minutes, n, 5)) return false; }
      if (state.tab === 'morning') { if (r.time_minutes < MORNING_START || r.time_minutes > MORNING_END) return false; }
      if (state.tab === 'evening') { if (r.time_minutes < EVENING_START || r.time_minutes > EVENING_END) return false; }
      if (state.dayFilter !== 'all' && !isServiceDay(r.service_label, activeDayCode())) return false;
      return true;
    });

    state.filtered = rows;
    renderResults(rows, n);
    updateTabCounts(n);
    updateNextBus();
    renderGoHome();
    const tabLabels = { now: 'Prochains \xB15 min', morning: 'Matin 07:15–08:15', evening: 'Soir 17:40–19:00', favorites: 'Favoris', all: 'Tous les horaires', live: 'Live \xB1' + state.liveTol + ' min' };
    /* L'onglet Live re-filtre dans renderLiveBoard (arret + tolerance) : on
       affiche le vrai nombre de passages live, pas le pool generique. */
    const infoCount = state.tab === 'live'
      ? ALL.filter(r => (!state.liveStop || r.target_stop === state.liveStop) && runsToday(r) && inRange(r.time_minutes, n, state.liveTol)).length
      : rows.length;
    $('resultInfo').textContent = `${infoCount} passage(s) — ${tabLabels[state.tab] || ''}`;
  }

  function resetFilters() {
    Object.assign(state, { stop: '', line: '', direction: '', service: '', timeTarget: '', timeTol: 5, search: '' });
    ['globalSearch', 'directionFilter', 'timeFilter'].forEach(id => $(id).value = '');
    ['stopFilter', 'lineFilter', 'serviceFilter'].forEach(id => $(id).value = '');
    $('timeTolerance').value = '5';
    saveState();
    applyFilters();
  }

  /* ===== Rendu principal ===== */
  function renderResults(rows, n) {
    if (!rows.length) { $('results').innerHTML = emptyForTab(state.tab, n); return; }

    if (state.tab === 'live')      { $('results').innerHTML = renderLiveBoard(n);        return; }
    if (state.tab === 'favorites') { $('results').innerHTML = renderFavorites(n);         return; }

    if (state.tab === 'morning') { $('results').innerHTML = renderMorningJourney(rows, n); return; }
    if (state.tab === 'evening') { $('results').innerHTML = renderEveningJourney(rows, n); return; }

    /* Onglets now / all : groupement par arret */
    const groups = new Map();
    for (const r of rows) { const key = r.target_stop || r.stop; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(r); }
    $('results').innerHTML = [...groups.entries()].map(([stop, list]) => renderStopGroup(stop, list, n)).join('');
  }

  /* ===== Onglet Matin — Trajet en étapes ===== */
  /* Note honnete quand le train L50 n'a pas de donnees pour le jour affiche
     (donnees extraites en lu-ve uniquement : pas d'horaires train le week-end/ferie) */
  function trainGapNote() {
    const code = state.dayFilter === 'all' ? null : activeDayCode();
    if (!code || code === 'weekday') return '';
    if (ALL.some(r => r.network === 'CFL' && isServiceDay(r.service_label, code))) return '';
    const dayLabel = code === 'sat' ? 'le samedi' : 'le dimanche / jour ferie';
    return `<div class="info-note">ℹ️ Horaires du train L50 indisponibles ${dayLabel} dans cette app (donn\xE9es extraites en lu-ve uniquement). V\xE9rifiez sur cfl.lu.</div>`;
  }

  function renderMorningJourney(rows, n) {
    const train     = rows.filter(r => r.network === 'CFL' && STOP_MAMER_TRAIN.includes(r.target_stop));
    const etape1    = rows.filter(r => STOP_MAMER.includes(r.target_stop) && isCityBound(r.direction));
    const etape2    = rows.filter(r => STOP_BELLE_AVL.includes(r.target_stop) && r.line === '10');
    const autresSet = new Set([...train, ...etape1, ...etape2]);
    const autres    = rows.filter(r => !autresSet.has(r));

    let html = renderConnectionWidget(n);
    if (train.length)  html += journeySection('train',    '\u{1F686} Train L50 — Mamer Gare → Luxembourg', train, n);
    else               html += trainGapNote();
    if (etape1.length) html += journeySection('aller',    '\u{1F68C} Étape 1 — Mamer → Belle-Étoile (RGTR)', etape1, n);
    if (etape2.length) html += journeySection('connexion','\u{1F517} Étape 2 — Belle-Étoile → Ville (AVL 10)', etape2, n);
    if (autres.length) html += journeySection('autres',   'Autres passages matin', autres, n);
    if (!html) html = emptyForTab('morning', n);
    return html;
  }

  /* ===== Onglet Soir — Trajet en étapes ===== */
  function renderEveningJourney(rows, n) {
    const train     = rows.filter(r => r.network === 'CFL' && STOP_LUX_TRAIN.includes(r.target_stop));
    const etape1    = rows.filter(r => STOP_CITY_AVL.includes(r.target_stop) && r.line === '10');
    const etape2    = rows.filter(r => STOP_BELLE_RGTR.includes(r.target_stop) && isMamerBound(r.direction));
    const autresSet = new Set([...train, ...etape1, ...etape2]);
    const autres    = rows.filter(r => !autresSet.has(r));

    let html = '';
    if (train.length)  html += journeySection('train',    '\u{1F686} Train L50 — Luxembourg → Mamer Gare', train, n);
    else               html += trainGapNote();
    if (etape1.length) html += journeySection('connexion','\u{1F68C} Étape 1 — Ville → Belle-Étoile (AVL 10)', etape1, n);
    if (etape2.length) html += journeySection('retour',   '\u{1F517} Étape 2 — Belle-Étoile → Mamer (RGTR)', etape2, n);
    if (autres.length) html += journeySection('autres',   'Autres passages soir', autres, n);
    if (!html) html = emptyForTab('evening', n);
    return html;
  }

  /* ===== Onglet Live — tableau de départ temps réel ===== */
  function renderLiveBoard(n) {
    const stops = unique(ALL.map(r => r.target_stop));

    /* Chips d'arrets */
    const stopChips = ['', ...stops].map(s => {
      const active = state.liveStop === s;
      const label  = s || 'Tous les arrêts';
      return `<button class="live-stop-chip${active ? ' active' : ''}" data-action="live-stop" data-stop="${escapeHtml(s)}" type="button">${escapeHtml(label)}</button>`;
    }).join('') + `<button class="live-stop-chip live-gps-btn" data-action="live-gps" type="button" title="Détecter l'arrêt le plus proche">\u{1F4CD} GPS</button>`;

    /* Boutons tolerance */
    const tolBtns = [5, 10, 30].map(t =>
      `<button class="live-tol-btn${state.liveTol === t ? ' active' : ''}" data-action="live-tol" data-tol="${t}" type="button">\xB1${t} min</button>`
    ).join('');

    /* Filtrage */
    const rows = ALL.filter(r => {
      if (state.liveStop && r.target_stop !== state.liveStop) return false;
      if (!runsToday(r)) return false;
      return inRange(r.time_minutes, n, state.liveTol);
    });

    /* Tri : a venir en premier (ordre chrono), passes en fin */
    const upcoming = rows.filter(r => r.time_minutes >= n - 2).sort((a, b) => a.time_minutes - b.time_minutes);
    const past     = rows.filter(r => r.time_minutes  < n - 2).sort((a, b) => b.time_minutes - a.time_minutes);
    const sorted   = [...upcoming, ...past];

    /* Lignes du tableau */
    const boardRows = sorted.map(r => {
      const diff   = r.time_minutes - n;
      const isNow  = Math.abs(diff) <= 2;
      const isSoon = diff > 2 && diff <= state.liveTol;
      const isPast = diff < -2;
      const rowCls = isNow ? 'live-row is-now' : isSoon ? 'live-row is-soon' : isPast ? 'live-row is-past' : 'live-row';
      const { text: cdText, cls: cdCls } = countdown(diff);
      const lineCls = netCls(r.network);
      const meta = !state.liveStop
        ? escapeHtml(r.target_stop) + (r.course ? ' \xB7 ' + escapeHtml(r.course) : '')
        : r.course ? escapeHtml(r.course) : escapeHtml(r.service_label || '');

      return `<div class="${rowCls}" data-minutes="${r.time_minutes}">
        <div class="live-row-time">
          <span class="live-time-val">${escapeHtml(r.time)}</span>
          <span class="live-countdown ${cdCls}">${escapeHtml(cdText)}</span>
        </div>
        <div class="live-row-info">
          <div class="live-row-top">
            <span class="badge ${lineCls}">${escapeHtml(r.network)} ${escapeHtml(r.line)}</span>
            <span class="live-direction">${escapeHtml(r.direction)}</span>
          </div>
          ${meta ? `<div class="live-meta">${meta}</div>` : ''}
        </div>
      </div>`;
    }).join('');

    const stopName = state.liveStop || 'Tous les arrêts';
    const countLabel = sorted.length
      ? `${upcoming.length} \xE0 venir${past.length ? ', ' + past.length + ' pass\xE9(s)' : ''}`
      : `Aucun d\xE9part dans \xB1${state.liveTol}\xa0min`;
    const mapUrl = state.liveStop ? itineraryUrl(state.liveStop) : null;
    const mapBtn = mapUrl
      ? `<a class="map-btn" href="${mapUrl}" target="_blank" rel="noopener noreferrer" title="Itinéraire à pied vers cet arrêt">🗺 Itinéraire</a>`
      : '';

    return `<div class="live-board">
      <div class="live-controls">
        <div class="live-stops-scroll">${stopChips}</div>
        <div class="live-tol-row">${tolBtns}</div>
      </div>
      <div class="live-board-header">
        <div class="live-board-left">
          <span class="live-board-title">\u{1F4CD} ${escapeHtml(stopName)}</span>
          ${mapBtn}
        </div>
        <span class="live-board-count">${escapeHtml(countLabel)}</span>
      </div>
      <div class="live-table" id="liveTable">
        ${boardRows || '<div class="live-empty">Aucun passage dans cette fen\xEAtre horaire.<br>Essayez \xB130 min.</div>'}
      </div>
    </div>`;
  }

  function journeySection(type, title, rows, n) {
    /* Grouper par arret dans chaque section */
    const groups = new Map();
    for (const r of rows) { const k = r.target_stop || r.stop; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
    const body = [...groups.entries()].map(([stop, list]) => renderStopGroup(stop, list, n)).join('');
    return `<div class="journey-section">
      <div class="journey-header ${escapeHtml(type)}">
        <span class="journey-title">${escapeHtml(title)}</span>
        <span class="journey-count">${rows.length} passage(s)</span>
      </div>
      ${body}
    </div>`;
  }

  /* ===== Onglet Favoris ===== */
  function renderFavorites(n) {
    if (!state.favorites.length) return emptyHtml('Aucun favori', 'Cliquez sur ☆ sur une carte pour sauvegarder un trajet.', '★');
    return state.favorites.map(fav => renderFavCard(fav, n)).join('');
  }

  function renderFavCard(fav, n) {
    /* Tous les horaires de ce trajet (ligne + arret + direction) */
    const allTimes = ALL.filter(r => r.line === fav.line && r.target_stop === fav.target_stop && r.direction === fav.direction);
    /* Afficher les 3h a venir + passees recentes (<20 min) */
    const visible = allTimes.filter(r => { const d = r.time_minutes - n; return d >= -20 && d <= 180; });
    /* Si rien a venir, prochains 5 */
    const toShow = visible.length ? visible : allTimes.slice(0, 8);

    const chips = toShow.map(r => {
      const diff = r.time_minutes - n;
      const isNow  = Math.abs(diff) <= 2;
      const isSoon = diff > 0 && diff <= 30;
      const isPast = diff < 0;
      const cls = isNow ? 'is-now' : isSoon ? 'is-soon' : isPast ? 'is-past' : '';
      const { text: cdText, cls: cdCls } = countdown(diff);
      return `<div class="fav-time-chip ${cls}" title="${escapeHtml(r.time)} — ${escapeHtml(r.service_label || '')}">
        <span class="fav-chip-time">${escapeHtml(r.time)}</span>
        <span class="fav-chip-cd ${cdCls}">${escapeHtml(cdText)}</span>
      </div>`;
    }).join('');

    const lineCls = netCls(fav.network);
    return `<div class="fav-route-card" data-favkey="${escapeHtml(fav.key)}">
      <div class="fav-route-header">
        <div class="fav-route-info">
          <div class="card-badges fav-card-badges">
            <span class="badge ${lineCls}">${escapeHtml(fav.network)} ${escapeHtml(fav.line)}</span>
          </div>
          <div class="fav-route-dir">${escapeHtml(fav.direction)}</div>
          <div class="fav-route-meta">${escapeHtml(fav.target_stop)} · ${allTimes.length} dep/jour</div>
        </div>
        <button class="fav-remove-btn" data-action="remove-fav" data-key="${escapeHtml(fav.key)}" aria-label="Retirer ce favori" type="button" title="Retirer">✕</button>
      </div>
      ${toShow.length ? `<div class="fav-times-list">${chips}</div>` : '<p class="fav-times-empty">Aucun passage dans les 3 prochaines heures.</p>'}
    </div>`;
  }

  /* ===== Groupe d'arret ===== */
  function renderStopGroup(stop, list, n) {
    list.sort((a, b) => a.time_minutes - b.time_minutes);
    return `<div class="stop-group">
      <div class="stop-group-header">
        <span class="stop-group-name">${escapeHtml(stop)}</span>
        <span class="stop-group-count">${list.length} passage(s)</span>
      </div>
      <hr class="stop-divider">
      ${list.map(r => renderCard(r, n)).join('')}
    </div>`;
  }

  /* ===== Card bus ===== */
  function renderCard(r, n) {
    const diff   = r.time_minutes - n;
    const isNow  = Math.abs(diff) <= 2;
    const isSoon = Math.abs(diff) <= 5 && !isNow;
    const cls    = isNow ? 'is-now' : isSoon ? 'is-soon' : '';
    const { text: cdText, cls: cdCls } = countdown(diff);
    const lineCls = netCls(r.network);
    const fav     = isFav(r);
    const key     = favKey(r);

    let periodBadge = '';
    if (isNow)                             periodBadge = '<span class="badge badge-now">Now</span>';
    else if (r.period === 'morning_alert') periodBadge = '<span class="badge badge-morning" title="07:15–08:15">Matin</span>';
    else if (r.period === 'evening_alert') periodBadge = '<span class="badge badge-evening" title="17:40–19:00">Soir</span>';

    const shareBtn = (navigator.share || navigator.clipboard)
      ? `<button class="share-btn" data-action="share" aria-label="Partager" title="Partager" type="button">⬆</button>` : '';
    const akey     = alarmKey(r);
    const hasAlarm = alarms.has(akey);
    const alarmBtn = diff > 2
      ? `<button class="alarm-btn${hasAlarm ? ' is-active' : ''}" data-action="alarm" data-akey="${escapeHtml(akey)}" aria-label="${hasAlarm ? 'Annuler alarme' : 'Alarme'}" title="${hasAlarm ? 'Annuler alarme' : 'Alarme 3 min avant'}" type="button">🔔</button>`
      : '';

    return `<article class="bus-card ${cls}" data-minutes="${r.time_minutes}" data-fkey="${escapeHtml(key)}" aria-label="Ligne ${escapeHtml(r.line)} a ${escapeHtml(r.time)}">
      <div class="card-time">
        <span class="card-time-value">${escapeHtml(r.time)}</span>
        <span class="card-countdown ${cdCls}">${escapeHtml(cdText)}</span>
      </div>
      <div class="card-info">
        <div class="card-badges">
          <button class="badge ${lineCls}" data-action="open-tt" data-line="${escapeHtml(r.line)}" title="Voir horaires ligne ${escapeHtml(r.line)}" type="button">${escapeHtml(r.network)} ${escapeHtml(r.line)}</button>
          ${periodBadge}
        </div>
        <div class="card-direction">${escapeHtml(r.direction)}</div>
        <div class="card-meta">${escapeHtml(r.stop)}${r.course ? ' · ' + escapeHtml(r.course) : ''} · ${escapeHtml(r.service_label || 'Selon PDF')}</div>
      </div>
      <div class="card-actions">
        <button class="fav-btn${fav ? ' is-fav' : ''}" data-action="fav" aria-label="${fav ? 'Retirer' : 'Ajouter aux favoris'}" title="Favori" type="button">${fav ? '★' : '☆'}</button>
        ${alarmBtn}
        ${shareBtn}
      </div>
    </article>`;
  }

  /* ===== Countdowns live ===== */
  function refreshCountdowns() {
    const n = nowMin();
    document.querySelectorAll('.bus-card[data-minutes]').forEach(card => {
      const m = Number(card.dataset.minutes), diff = m - n;
      const cdEl = card.querySelector('.card-countdown');
      if (cdEl) { const { text, cls } = countdown(diff); cdEl.textContent = text; cdEl.className = `card-countdown ${cls}`; }
      card.classList.toggle('is-now',  Math.abs(diff) <= 2);
      card.classList.toggle('is-soon', Math.abs(diff) <= 5 && Math.abs(diff) > 2);
    });
    /* Live board rows */
    document.querySelectorAll('.live-row[data-minutes]').forEach(row => {
      const m = Number(row.dataset.minutes), diff = m - n;
      const { text, cls } = countdown(diff);
      const cdEl = row.querySelector('.live-countdown');
      if (cdEl) { cdEl.textContent = text; cdEl.className = `live-countdown ${cls}`; }
      row.classList.toggle('is-now',  Math.abs(diff) <= 2);
      row.classList.toggle('is-soon', diff > 2 && diff <= state.liveTol);
      row.classList.toggle('is-past', diff < -2);
    });
    /* Chips favoris */
    document.querySelectorAll('.fav-time-chip[title]').forEach(chip => {
      const t = chip.querySelector('.fav-chip-time')?.textContent;
      if (!t) return;
      const m = timeToMin(t), diff = m - n;
      const { text, cls } = countdown(diff);
      const cdEl = chip.querySelector('.fav-chip-cd');
      if (cdEl) { cdEl.textContent = text; cdEl.className = `fav-chip-cd ${cls}`; }
      chip.classList.toggle('is-now',  Math.abs(diff) <= 2);
      chip.classList.toggle('is-soon', diff > 0 && diff <= 30);
      chip.classList.toggle('is-past', diff < 0);
    });
  }

  /* ===== Horloge ===== */
  let lastMin = -1;
  function tick() {
    $('clock').textContent = nowTime();
    const n = nowMin();
    if (n !== lastMin) {
      lastMin = n;
      const busCount = ALL.filter(r => inRange(r.time_minutes, n, 5) && runsToday(r)).length;
      $('nowChip').textContent = `${busCount} bus \xB15 min`;
      if ('setAppBadge' in navigator) navigator.setAppBadge(busCount || 0).catch(() => {});
      refreshCountdowns();
      checkNotifications(n);
      if (state.tab === 'now' || state.tab === 'live') applyFilters();
      else { updateNextBus(); renderGoHome(); }
    }
  }

  /* ===== Online / Offline ===== */
  function updateOnlineStatus() {
    const bar = $('statusBar'), msg = $('statusBarMsg');
    if (!navigator.onLine) { msg.textContent = '⚡ Mode hors-ligne — données locales'; bar.hidden = false; }
    else bar.hidden = true;
  }

  /* ===== Notifications locales ===== */
  const notif = { enabled: false, notifiedBuses: new Set(), morningFired: false, eveningFired: false, lastDay: -1 };
  let toastTimer = null;

  function showToast(msg) {
    let el = document.querySelector('.notif-toast');
    if (!el) { el = document.createElement('div'); el.className = 'notif-toast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 4000);
  }
  function fireNotif(title, body, tag) {
    if (Notification.permission === 'granted') {
      try { new Notification(title, { body, icon: 'assets/icon-192.png', tag, renotify: true }); } catch (_) { showToast(title + ' -- ' + body); }
    } else { showToast(title + ' -- ' + body); }
  }
  async function requestNotifPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied')  return false;
    return (await Notification.requestPermission()) === 'granted';
  }
  function updateNotifBtn() {
    const btn = $('notifBtn'); if (!btn) return;
    btn.classList.toggle('notif-on', notif.enabled);
    btn.setAttribute('aria-pressed', String(notif.enabled));
    btn.title = notif.enabled ? 'Notifications actives (cliquer pour desactiver)' : 'Activer les notifications';
  }
  async function toggleNotifications() {
    if (notif.enabled) { notif.enabled = false; localStorage.setItem('bus-notif', '0'); updateNotifBtn(); showToast('Notifications désactivées'); return; }
    await requestNotifPermission();
    notif.enabled = true; localStorage.setItem('bus-notif', '1'); updateNotifBtn(); showToast('Notifications activées');
  }
  function resetDailyTracking(day) { if (day !== notif.lastDay) { notif.notifiedBuses.clear(); notif.morningFired = false; notif.eveningFired = false; notif.lastDay = day; } }
  function checkNotifications(n) {
    if (!notif.enabled) return;
    resetDailyTracking(new Date().getDate());
    if (n === MORNING_START && !notif.morningFired) {
      notif.morningFired = true;
      const nb = morningAll.filter(r => (!state.stop || r.target_stop === state.stop) && runsToday(r)).length;
      fireNotif('\u{1F305} Alerte matin', `${nb} bus disponibles — 07:15 à 08:15`, 'alert-morning');
    }
    if (n === EVENING_START && !notif.eveningFired) {
      notif.eveningFired = true;
      const nb = eveningAll.filter(r => (!state.stop || r.target_stop === state.stop) && runsToday(r)).length;
      fireNotif('\u{1F306} Alerte soir', `${nb} bus disponibles — 17:40 à 19:00`, 'alert-evening');
    }
    if (state.favorites.length) {
      ALL.filter(r => isFav(r) && runsToday(r) && inRange(r.time_minutes, n, 5)).forEach(r => {
        const key = r.line + '|' + r.time + '|' + r.target_stop;
        if (notif.notifiedBuses.has(key)) return;
        notif.notifiedBuses.add(key);
        const diff = r.time_minutes - n;
        const when = diff <= 1 ? 'maintenant' : `dans ${diff} min`;
        fireNotif(`Bus ${r.line} (${when})`, `${r.time} — ${r.target_stop}\n${r.direction}`, 'bus-' + key);
      });
    }
  }

  /* ===== Service Worker ===== */
  function initSW() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    navigator.serviceWorker.register('service-worker.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            $('statusBar').hidden = false;
            $('statusBarMsg').textContent = '\u{1F504} Mise à jour disponible';
            const btn = $('updateBtn'); btn.hidden = false;
            btn.onclick = () => { worker.postMessage({ type: 'SKIP_WAITING' }); location.reload(); };
          }
        });
      });
      /* Enregistrer le sync periodique apres que le SW est pret */
      navigator.serviceWorker.ready.then(r => registerPeriodicSync(r));
    }).catch(() => {});

    /* Message du SW : ouvrir un onglet specifique */
    navigator.serviceWorker.addEventListener('message', ev => {
      if (ev.data?.type === 'OPEN_TAB' && ev.data.tab) {
        state.tab = ev.data.tab;
        document.querySelectorAll('.tab').forEach(b => {
          const active = b.dataset.tab === state.tab;
          b.classList.toggle('active', active);
          b.setAttribute('aria-selected', String(active));
        });
        saveState(); applyFilters();
      }
    });
  }

  async function registerPeriodicSync(reg) {
    if (!('periodicSync' in reg)) return;
    try {
      const perm = await navigator.permissions.query({ name: 'periodic-background-sync' });
      if (perm.state !== 'granted') return;
      /* Enregistrer seulement si la permission est accordee (PWA installee sur Android) */
      await reg.periodicSync.register('bus-alert', { minInterval: 15 * 60 * 1000 });
    } catch (_) {}
  }

  /* ===== PWA Install ===== */
  function initInstall() {
    let deferred = null;
    window.addEventListener('beforeinstallprompt', ev => { ev.preventDefault(); deferred = ev; $('installBtn').hidden = false; });
    $('installBtn').addEventListener('click', async () => {
      if (!deferred) return;
      deferred.prompt(); await deferred.userChoice; deferred = null; $('installBtn').hidden = true;
    });
  }

  /* ===== Panel Arrêts ===== */
  function openStopsPanel() {
    const panel = $('stopsPanel'), body = $('stopsPanelBody');
    const counts = {};
    const morning_c = {}, evening_c = {};
    ALL.forEach(r => {
      const s = r.target_stop;
      counts[s] = (counts[s] || 0) + 1;
      if (r.period === 'morning_alert') morning_c[s] = (morning_c[s] || 0) + 1;
      if (r.period === 'evening_alert') evening_c[s] = (evening_c[s] || 0) + 1;
    });
    const stops = unique(ALL.map(r => r.target_stop));
    body.innerHTML = `<div class="stop-stat-list">${stops.map(s => {
      const lines = unique(ALL.filter(r => r.target_stop === s).map(r => r.line));
      return `<div class="stop-stat-item" data-stop="${escapeHtml(s)}">
        <div class="stop-stat-info">
          <div class="stop-stat-name">${escapeHtml(s)}</div>
          <div class="stop-stat-lines">Lignes : ${escapeHtml(lines.join(' · '))}</div>
        </div>
        <div class="stop-stat-counts">
          <span class="stop-stat-pill">${counts[s] || 0} tot</span>
          ${morning_c[s] ? `<span class="stop-stat-pill morning">${morning_c[s]} mat</span>` : ''}
          ${evening_c[s] ? `<span class="stop-stat-pill evening">${evening_c[s]} soir</span>` : ''}
        </div>
      </div>`;
    }).join('')}</div>`;
    /* Clic sur un arret = ferme panel + filtre */
    body.querySelectorAll('.stop-stat-item').forEach(item => {
      item.addEventListener('click', () => {
        state.stop = item.dataset.stop;
        $('stopFilter').value = item.dataset.stop;
        saveState(); closePanel('stopsPanel'); applyFilters();
      });
    });
    panel.hidden = false;
  }

  /* ===== Panel Horaires par ligne ===== */
  function openTimetablePanel(line) {
    if (line) state.ttLine = line;
    if (!state.ttLine) state.ttLine = unique(ALL.map(r => r.line))[0];
    renderTimetableContent();
    $('schedulesPanel').hidden = false;
  }

  function renderTimetableContent() {
    const n     = nowMin();
    const lines = unique(ALL.map(r => r.line));

    /* Chips de ligne */
    const lineChips = lines.map(l => {
      const net = ALL.find(r => r.line === l)?.network || '';
      const cls = netCls(net);
      const active = state.ttLine === l;
      /* Compter les departs a venir dans ±30 min */
      const near = ALL.filter(r => r.line === l && inRange(r.time_minutes, n, 30) && r.time_minutes >= n - 2).length;
      const nearBadge = near ? ` <span class="tt-near-badge">${near}</span>` : '';
      return `<button class="tt-chip${active ? ' active' : ''} ${cls}" data-action="tt-line" data-ttline="${escapeHtml(l)}" type="button">${escapeHtml(l)}${nearBadge}</button>`;
    }).join('');

    /* Donnees de la ligne selectionnee */
    const rows    = ALL.filter(r => r.line === state.ttLine);
    const stops   = unique(rows.map(r => r.target_stop));
    const network = rows[0]?.network || '';
    const netLabel = network === 'CFL' ? 'Train CFL' : network;

    /* Nombre de departs a venir */
    const nearCount = rows.filter(r => inRange(r.time_minutes, n, 30) && r.time_minutes >= n - 2).length;
    const nearLabel = nearCount
      ? ` · <strong class="tt-near-label">${nearCount} dans ±30\xa0min</strong>`
      : '';

    const stopSections = stops.map(stop => {
      const stopRows = rows.filter(r => r.target_stop === stop);
      const dirs     = unique(stopRows.map(r => r.direction));

      const dirBlocks = dirs.map(dir => {
        const dest     = (dir || '').split(/→|->/).pop().trim();
        const services = unique(stopRows.filter(r => r.direction === dir).map(r => r.service_label));

        const svcBlocks = services.map(svc => {
          const timesData = stopRows
            .filter(r => r.direction === dir && r.service_label === svc)
            .sort((a, b) => a.time_minutes - b.time_minutes);
          const svcIcon = /samedi/i.test(svc) ? '\u{1F7E1}' : /dimanche|f.ri/i.test(svc) ? '\u{1F535}' : '\u{1F7E2}';
          const timesHtml = timesData.map(r => {
            const diff = r.time_minutes - n;
            const cls  = Math.abs(diff) <= 2 ? 'tt-time is-now'
                       : diff >= -2 && diff <= 30 ? 'tt-time is-soon'
                       : diff < -2 ? 'tt-time is-past'
                       : 'tt-time';
            return `<span class="${cls}" data-minutes="${r.time_minutes}">${escapeHtml(r.time)}</span>`;
          }).join('');
          return `<div class="tt-svc-row">
            <span class="tt-svc-label">${svcIcon} ${escapeHtml(svc || 'Tous jours')}</span>
            <div class="tt-times">${timesHtml}</div>
          </div>`;
        }).join('');

        return `<div class="tt-dir-block">
          <div class="tt-dir-label">→ ${escapeHtml(dest)}</div>
          ${svcBlocks}
        </div>`;
      }).join('');

      return `<div class="tt-stop-section">
        <div class="tt-stop-header">
          <span class="tt-stop-icon">\u{1F4CD}</span>
          <span class="tt-stop-name">${escapeHtml(stop)}</span>
          <span class="tt-stop-count">${stopRows.length} dep.</span>
        </div>
        ${dirBlocks}
      </div>`;
    }).join('');

    $('schedulesPanelBody').innerHTML =
      `<div class="tt-line-bar">${lineChips}</div>
       <div class="tt-summary">${escapeHtml(netLabel)} · Ligne ${escapeHtml(state.ttLine)} · ${rows.length} passages · ${stops.length} arr\xEAt(s)${nearLabel}</div>
       <div class="tt-sections">${stopSections}</div>`;

    /* Clicks sur les chips de ligne */
    $('schedulesPanelBody').querySelectorAll('[data-action="tt-line"]').forEach(btn => {
      btn.addEventListener('click', () => { state.ttLine = btn.dataset.ttline; renderTimetableContent(); });
    });

    /* Scroll vers le premier horaire proche */
    requestAnimationFrame(() => {
      const first = $('schedulesPanelBody').querySelector('.tt-time.is-now, .tt-time.is-soon');
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  function closePanel(id) { $(id).hidden = true; }

  /* ===== Filtre jour — chips ===== */
  function renderDayFilterChips() {
    const today = new Date();
    const tomDate = new Date(); tomDate.setDate(tomDate.getDate() + 1);
    const codeLabel = (code, date) => holidayName(date) ? 'Ferie' : code === 'weekday' ? 'Lu-Ve' : code === 'sat' ? 'Sam' : 'Dim';
    const autoLabel = codeLabel(getAutoDay(), today);
    const tomLabel  = codeLabel(getTomorrowDay(), tomDate);
    const opts = [
      { code: 'auto',     label: `Auj. (${autoLabel})` },
      { code: 'tomorrow', label: `Demain (${tomLabel})` },
      { code: 'weekday',  label: 'Lu-Ve' },
      { code: 'sat',      label: 'Sam' },
      { code: 'sun',      label: 'Dim' },
      { code: 'all',      label: 'Tous' },
    ];
    $('dayFilterChips').innerHTML = opts.map(o =>
      `<button class="day-filter-chip${state.dayFilter === o.code ? ' active' : ''}" data-day="${o.code}" type="button">${escapeHtml(o.label)}</button>`
    ).join('');
    $('dayFilterChips').querySelectorAll('.day-filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        state.dayFilter = btn.dataset.day;
        renderDayFilterChips();
        renderLinesBar();
        applyFilters();
      });
    });
  }

  /* ===== Mise a jour des donnees ===== */
  async function checkDataUpdate() {
    if (location.protocol === 'file:') { showToast('Mise \xE0 jour non disponible en local'); return; }
    const btn = $('updateDataBtn');
    btn.textContent = '⏳'; btn.disabled = true;
    try {
      const res  = await fetch('./data/bus-schedules.json', { cache: 'no-cache' });
      const data = await res.json();
      const newCount = (data.schedules || []).length;
      const curCount = (window.BUS_SCHEDULES?.schedules || []).length;
      if (newCount !== curCount) {
        $('statusBar').hidden = false;
        $('statusBarMsg').textContent = `\u{1F504} Nouvelles donn\xE9es : ${newCount} horaires (actuellement ${curCount})`;
        $('updateBtn').hidden = false;
        $('updateBtn').onclick = () => location.reload();
        showToast(`Mise \xE0 jour disponible (${newCount} horaires)`);
      } else {
        showToast(`Donn\xE9es \xE0 jour ✓ (${curCount} horaires)`);
      }
    } catch (_) {
      showToast('V\xE9rification impossible (hors ligne ?)');
    } finally {
      btn.textContent = '\u{1F504}'; btn.disabled = false;
    }
  }

  /* ===== Barre raccourcis lignes (dans main) ===== */
  function renderLinesBar() {
    const n     = nowMin();
    const lines = unique(ALL.map(r => r.line));
    const chips = lines.map(l => {
      const net  = ALL.find(r => r.line === l)?.network || '';
      const cls  = netCls(net);
      const near = ALL.filter(r => r.line === l && runsToday(r) && r.time_minutes >= n - 2 && r.time_minutes <= n + 30).length;
      const nearHtml = near
        ? `<span class="chip-near">${near}</span>`
        : '';
      return `<button class="lines-shortcut-chip ${cls}" data-action="open-tt" data-line="${escapeHtml(l)}" type="button" title="Horaires ligne ${escapeHtml(l)}">${escapeHtml(net)} ${escapeHtml(l)}${nearHtml}</button>`;
    }).join('');
    $('linesShortcutsChips').innerHTML = chips;
  }

  /* ===== Etats vides ===== */
  function emptyHtml(title, msg, icon) {
    return `<div class="empty-state"><div class="empty-icon">${icon}</div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(msg)}</p></div>`;
  }
  function emptyForTab(tab, n) {
    if (tab === 'now')       return emptyHtml('Pas de bus dans \xB15 min', `Il est ${minToHHMM(n)}. Essayez l'onglet Tout.`, '\u{1F550}');
    if (tab === 'morning')   return emptyHtml('Aucun resultat matin',   "Retirez un filtre d'arret ou de ligne.", '\u{1F305}');
    if (tab === 'evening')   return emptyHtml('Aucun resultat soir',    "Retirez un filtre d'arret ou de ligne.", '\u{1F306}');
    if (tab === 'favorites') return emptyHtml('Aucun favori', "Cliquez sur ☆ sur une carte pour l'ajouter.", '★');
    return emptyHtml('Aucun resultat', "Elargissez les filtres ou augmentez la tolerance.", '\u{1F50D}');
  }

  /* ===== Init ===== */
  function init() {
    initTheme();
    loadState();

    populateSelect($('stopFilter'),    unique(ALL.map(r => r.target_stop)),   'Tous les arrets');
    populateSelect($('lineFilter'),    unique(ALL.map(r => r.line)),           'Toutes les lignes');
    populateSelect($('serviceFilter'), unique(ALL.map(r => r.service_label)), 'Tous les services');
    if (state.stop) $('stopFilter').value = state.stop;

    /* Onglets */
    document.querySelectorAll('.tab').forEach(btn => {
      if (!btn.dataset.tab) return;
      const active = btn.dataset.tab === state.tab;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
      btn.addEventListener('click', () => {
        haptic([20]);
        state.tab = btn.dataset.tab;
        document.querySelectorAll('.tab').forEach(b => { b.classList.toggle('active', b === btn); b.setAttribute('aria-selected', String(b === btn)); });
        saveState();
        if (state.tab === 'live') detectNearestStop();
        else applyFilters();
      });
    });

    /* Indicateur du jour */
    const di = getDayInfo();
    $('dayChip').textContent = `${di.icon} Aujourd'hui : ${di.label}`;

    /* Recherche */
    const doSearch = debounce(() => {
      const q = $('globalSearch').value;
      state.search = q;
      if (q) { addHistory(q); renderHistory(); } else $('searchHistory').hidden = true;
      applyFilters();
    }, 250);
    $('globalSearch').addEventListener('input', doSearch);
    $('globalSearch').addEventListener('focus', () => { if (state.history.length) renderHistory(); });
    document.addEventListener('click', e => { if (!e.target.closest('.search-wrap')) $('searchHistory').hidden = true; });
    $('searchHistory').addEventListener('click', e => {
      const item = e.target.closest('.history-item');
      if (!item) return;
      $('globalSearch').value = item.dataset.q; state.search = item.dataset.q;
      $('searchHistory').hidden = true; applyFilters();
    });
    $('searchHistory').addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const item = e.target.closest('.history-item');
      if (item) { $('globalSearch').value = item.dataset.q; state.search = item.dataset.q; $('searchHistory').hidden = true; applyFilters(); }
    });

    /* Filtres */
    const debouncedFilter = debounce(applyFilters, 180);
    $('stopFilter').addEventListener('change', e => { state.stop = e.target.value; saveState(); debouncedFilter(); });
    $('lineFilter').addEventListener('change', e => { state.line = e.target.value; debouncedFilter(); });
    $('serviceFilter').addEventListener('change', e => { state.service = e.target.value; debouncedFilter(); });
    $('directionFilter').addEventListener('input', debounce(e => { state.direction = e.target.value; applyFilters(); }, 250));
    $('timeFilter').addEventListener('change', e => { state.timeTarget = e.target.value; debouncedFilter(); });
    $('timeTolerance').addEventListener('change', e => { state.timeTol = Number(e.target.value); debouncedFilter(); });
    $('resetBtn').addEventListener('click', resetFilters);
    $('stopsBtn').addEventListener('click', openStopsPanel);
    $('schedulesBtn').addEventListener('click', () => openTimetablePanel());
    renderLinesBar();
    renderDayFilterChips();
    $('linesShortcutsChips').addEventListener('click', e => {
      const btn = e.target.closest('[data-action="open-tt"]');
      if (btn) openTimetablePanel(btn.dataset.line);
    });
    $('walkMinus').addEventListener('click', () => { haptic([20]); state.walkMin = Math.max(0, state.walkMin - 1); saveState(); updateNextBus(); });
    $('walkPlus').addEventListener('click',  () => { haptic([20]); state.walkMin = Math.min(20, state.walkMin + 1); saveState(); updateNextBus(); renderGoHome(); });
    $('goHomeFlip').addEventListener('click', () => {
      haptic([20]);
      state.goDir = computeGoTarget() === 'city' ? 'home' : 'city';
      saveState();
      renderGoHome();
    });
    $('updateDataBtn').addEventListener('click', checkDataUpdate);
    $('stopsPanelClose').addEventListener('click', () => closePanel('stopsPanel'));
    $('schedulesPanelClose').addEventListener('click', () => closePanel('schedulesPanel'));
    /* Fermer overlay en cliquant le fond */
    ['stopsPanel', 'schedulesPanel'].forEach(id => {
      $(id).addEventListener('click', e => { if (e.target === $(id)) closePanel(id); });
    });

    /* Delegation actions cartes */
    $('results').addEventListener('click', e => {
      const btn = e.target.closest('[data-action]'); if (!btn) return;
      if (btn.dataset.action === 'fav') {
        const card = btn.closest('.bus-card'); if (!card) return;
        const r = findRecord(card); if (r) toggleFav(r);
      }
      if (btn.dataset.action === 'share') {
        const card = btn.closest('.bus-card'); if (!card) return;
        const r = findRecord(card); if (r) shareCard(r);
      }
      if (btn.dataset.action === 'remove-fav') {
        const key = btn.dataset.key;
        const idx = state.favorites.findIndex(f => f.key === key);
        if (idx >= 0) { state.favorites.splice(idx, 1); saveState(); updateFavCount(); applyFilters(); }
      }
      if (btn.dataset.action === 'live-stop') {
        state.liveStop = state.liveStop === btn.dataset.stop ? '' : btn.dataset.stop;
        applyFilters();
      }
      if (btn.dataset.action === 'live-tol') {
        state.liveTol = Number(btn.dataset.tol);
        saveState(); applyFilters();
      }
      if (btn.dataset.action === 'live-gps') {
        detectNearestStop();
      }
      if (btn.dataset.action === 'open-tt') {
        openTimetablePanel(btn.dataset.line);
      }
      if (btn.dataset.action === 'alarm') {
        const card = btn.closest('.bus-card'); if (!card) return;
        const r = findRecord(card); if (r) setAlarm(r);
      }
    });

    /* GPS header */
    $('gpsBtn').addEventListener('click', () => {
      haptic();
      state.tab = 'live';
      document.querySelectorAll('.tab').forEach(b => {
        const active = b.dataset.tab === 'live';
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', String(active));
      });
      saveState();
      detectNearestStop();
    });

    /* Theme + Notif */
    $('themeToggle').addEventListener('click', toggleTheme);
    notif.enabled = localStorage.getItem('bus-notif') === '1';
    updateNotifBtn();
    $('notifBtn').addEventListener('click', toggleNotifications);

    /* Online/Offline */
    updateOnlineStatus();
    window.addEventListener('online',  updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    initInstall();
    initSW();
    /* Footer dynamique */
    const _rgtr = unique(ALL.filter(r => r.network === 'RGTR').map(r => r.line)).join(' ');
    const _avl  = unique(ALL.filter(r => r.network === 'AVL').map(r => r.line)).join(' ');
    const _cfl  = unique(ALL.filter(r => r.network === 'CFL').map(r => r.line)).join(' ');
    const _stops = unique(ALL.map(r => r.target_stop)).length;
    const _fs = document.querySelector('.app-footer p:first-child');
    const _fl = document.querySelector('.app-footer p:last-child');
    if (_fs) _fs.textContent = `Mode offline \u00B7 Donn\u00E9es embarqu\u00E9es \u00B7 ${ALL.length} horaires \u00B7 ${_stops} arr\u00EAts`;
    if (_fl) _fl.textContent = (_rgtr ? `Lignes RGTR : ${_rgtr}` : '') + (_avl ? ` \u00B7 AVL : ${_avl}` : '') + (_cfl ? ` \u00B7 CFL Train : ${_cfl}` : '');
    /* ===== Swipe gauche/droite pour changer d'onglet ===== */
    const TAB_ORDER = ['live', 'now', 'morning', 'evening', 'favorites', 'all'];
    let swipeX0 = 0, swipeY0 = 0;
    document.querySelector('main').addEventListener('touchstart', e => {
      swipeX0 = e.touches[0].clientX;
      swipeY0 = e.touches[0].clientY;
    }, { passive: true });
    document.querySelector('main').addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - swipeX0;
      const dy = e.changedTouches[0].clientY - swipeY0;
      if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx) * 0.75) return;
      const idx = TAB_ORDER.indexOf(state.tab);
      const next = dx < 0
        ? TAB_ORDER[Math.min(idx + 1, TAB_ORDER.length - 1)]
        : TAB_ORDER[Math.max(idx - 1, 0)];
      if (next === state.tab) return;
      haptic([15]);
      state.tab = next;
      document.querySelectorAll('.tab').forEach(b => {
        const active = b.dataset.tab === state.tab;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', String(active));
      });
      saveState();
      applyFilters();
    }, { passive: true });

    restoreAlarms();
    applyFilters();
    detectNearestStop({ silent: true, watch: true });
    tick();
    setInterval(tick, 1000);
  }

  function findRecord(card) {
    const key = card.dataset.fkey, m = Number(card.dataset.minutes);
    return ALL.find(r => favKey(r) === key && r.time_minutes === m) || null;
  }

  init();
})();
