/* ============================================================
   BUS OFFLINE -- Application principale
   ============================================================ */
(() => {
  'use strict';

  /* ===== Données ===== */
  const DATA = window.BUS_SCHEDULES || { metadata: {}, schedules: [] };
  const ALL = (DATA.schedules || [])
    .slice()
    .sort((a, b) => a.time_minutes - b.time_minutes || a.line.localeCompare(b.line));

  /* ===== DOM helper ===== */
  const $ = id => document.getElementById(id);

  /* ===== Guard données vides ===== */
  if (!ALL.length) {
    $('results').innerHTML = emptyHtml('🚫', 'Aucune donnée', 'Le fichier bus-schedules.js est introuvable ou vide.');
    $('resultInfo').textContent = 'Données manquantes';
    return;
  }

  /* ===== Utilitaires ===== */
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

  /* Fenêtre glissante ± tolerant au passage à minuit */
  const inRange = (busMin, center, tol) => {
    const d = Math.abs(busMin - center);
    return Math.min(d, 1440 - d) <= tol;
  };

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  /* ===== Constantes plages horaires ===== */
  const MORNING_START = 7 * 60 + 15;   // 07:15
  const MORNING_END   = 8 * 60 + 15;   // 08:15
  const EVENING_START = 17 * 60 + 40;  // 17:40
  const EVENING_END   = 19 * 60;       // 19:00

  /* ===== Pré-calculs ===== */
  const morningAll = ALL.filter(r => r.time_minutes >= MORNING_START && r.time_minutes <= MORNING_END);
  const eveningAll = ALL.filter(r => r.time_minutes >= EVENING_START && r.time_minutes <= EVENING_END);

  /* ===== État application ===== */
  const state = {
    tab:           'now',
    stop:          '',
    line:          '',
    direction:     '',
    service:       '',
    timeTarget:    '',
    timeTol:       5,
    search:        '',
    favorites:     [],   // [{key, line, stop, direction, network}]
    history:       [],   // string[]
    filtered:      [],
  };

  /* ===== Persistance localStorage ===== */
  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem('bus-pwa') || '{}');
      if (s.tab && ['now','morning','evening','favorites','all'].includes(s.tab)) state.tab = s.tab;
      if (s.stop)                    state.stop      = s.stop;
      if (Array.isArray(s.favorites)) state.favorites = s.favorites;
      if (Array.isArray(s.history))   state.history   = s.history.slice(0, 5);
    } catch (_) {}
    /* Paramètre URL (shortcuts PWA) */
    const urlTab = new URLSearchParams(location.search).get('tab');
    if (urlTab && ['now','morning','evening','favorites','all'].includes(urlTab)) state.tab = urlTab;
  }

  function saveState() {
    try {
      localStorage.setItem('bus-pwa', JSON.stringify({
        tab:       state.tab,
        stop:      state.stop,
        favorites: state.favorites,
        history:   state.history,
      }));
    } catch (_) {}
  }

  /* ===== Thème clair/sombre ===== */
  function initTheme() {
    const saved = localStorage.getItem('bus-theme') || 'dark';
    applyTheme(saved);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const meta = $('metaThemeColor');
    if (meta) meta.content = theme === 'light' ? '#f1f5f9' : '#0a0f1e';
    localStorage.setItem('bus-theme', theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  /* ===== Jour de la semaine ===== */
  function getDayInfo() {
    const day = new Date().getDay();
    if (day === 0) return { label: 'Dimanche & jours fériés', icon: '🔵', type: 'sunday' };
    if (day === 6) return { label: 'Samedi',                  icon: '🟡', type: 'saturday' };
    return           { label: 'Lundi – Vendredi',             icon: '🟢', type: 'weekday' };
  }

  /* ===== Countdown ===== */
  function countdown(diffMin) {
    const abs = Math.abs(diffMin);
    if (abs <= 1)                    return { text: 'Maintenant',       cls: 'countdown-now' };
    if (diffMin > 0 && diffMin <= 90) return { text: `dans ${diffMin} min`, cls: 'countdown-soon' };
    if (diffMin < 0 && abs <= 20)    return { text: `−${abs} min`,         cls: 'countdown-past' };
    return { text: '', cls: '' };
  }

  /* ===== Favoris ===== */
  const favKey = r => `${r.line}|${r.target_stop}|${r.direction}`;
  const isFav  = r => state.favorites.some(f => f.key === favKey(r));

  function toggleFav(r) {
    const key = favKey(r);
    const idx = state.favorites.findIndex(f => f.key === key);
    if (idx >= 0) state.favorites.splice(idx, 1);
    else state.favorites.push({ key, line: r.line, stop: r.target_stop, direction: r.direction, network: r.network });
    saveState();
    updateFavCount();
    /* Mise à jour du bouton sans re-rendu complet */
    document.querySelectorAll(`.bus-card[data-key="${CSS.escape(key)}"] .fav-btn`).forEach(btn => {
      const fav = idx < 0; /* was added */
      btn.classList.toggle('is-fav', fav);
      btn.title = fav ? 'Retirer des favoris' : 'Ajouter aux favoris';
      btn.textContent = fav ? '★' : '☆';
    });
    if (state.tab === 'favorites') applyFilters();
  }

  function updateFavCount() {
    $('tabCountFavorites').textContent = state.favorites.length || '';
  }

  /* ===== Historique de recherche ===== */
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
      `<div class="history-item" role="option" tabindex="0" data-q="${escapeHtml(h)}">
         <span class="history-icon">⏱</span>
         <span>${escapeHtml(h)}</span>
       </div>`
    ).join('');
    el.querySelectorAll('.history-item').forEach(item => {
      const pick = () => {
        $('globalSearch').value = item.dataset.q;
        state.search = item.dataset.q;
        el.hidden = true;
        applyFilters();
      };
      item.addEventListener('click', pick);
      item.addEventListener('keydown', e => { if (e.key === 'Enter') pick(); });
    });
  }

  /* ===== Partage ===== */
  function shareCard(r) {
    const text = `Bus ${r.line} (${r.network}) -- ${r.time} à ${r.target_stop}\nDirection : ${r.direction}\nService : ${r.service_label || 'Selon PDF'}`;
    if (navigator.share) {
      navigator.share({ title: `Bus ${r.line} à ${r.time}`, text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => alert('Copié dans le presse-papier !')).catch(() => {});
    }
  }

  /* ===== Prochain bus widget ===== */
  function updateNextBus() {
    const n   = nowMin();
    const card = $('nextBusCard');
    const body = $('nextBusBody');

    const pool = ALL.filter(r => {
      if (state.stop && r.target_stop !== state.stop) return false;
      if (state.line && r.line         !== state.line) return false;
      const diff = r.time_minutes - n;
      return diff >= -2 && diff <= 120;
    });

    if (!pool.length) {
      card.classList.remove('has-bus');
      body.innerHTML = `<span style="color:var(--text3);font-size:.85rem">Aucun bus dans les 2 prochaines heures</span>`;
      return;
    }

    const next = pool.reduce((a, b) =>
      Math.abs(b.time_minutes - n) < Math.abs(a.time_minutes - n) ? b : a
    );
    const { text: cdText } = countdown(next.time_minutes - n);
    const lineCls = next.network === 'AVL' ? 'badge-avl' : 'badge-rgtr';

    card.classList.add('has-bus');
    body.innerHTML =
      `<span class="nb-time">${escapeHtml(next.time)}</span>` +
      `<span style="margin:0 8px;color:var(--text3)">·</span>` +
      `<span class="badge ${lineCls}">${escapeHtml(next.network)} ${escapeHtml(next.line)}</span>` +
      `<span style="margin-left:7px;font-size:.875rem;font-weight:600">${escapeHtml(next.direction)}</span>` +
      `<div class="nb-meta">${escapeHtml(next.target_stop)}${cdText ? ' · ' + cdText : ''}</div>`;
  }

  /* ===== Sélects ===== */
  function populateSelect(el, values, allLabel) {
    const saved = el.value;
    el.innerHTML = `<option value="">${escapeHtml(allLabel)}</option>` +
      values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
    if (saved && values.includes(saved)) el.value = saved;
  }

  /* ===== Mise à jour compteurs onglets ===== */
  function updateTabCounts(n) {
    $('tabCountNow').textContent     = ALL.filter(r => inRange(r.time_minutes, n, 5)).length || '';
    $('tabCountMorning').textContent = morningAll.length;
    $('tabCountEvening').textContent = eveningAll.length;
    updateFavCount();
  }

  /* ===== Filtrage ===== */
  function applyFilters() {
    const n      = nowMin();
    const dirNrm = normalize(state.direction);
    const txtNrm = normalize(state.search);
    const tTime  = state.timeTarget ? timeToMin(state.timeTarget) : null;
    const tol    = state.timeTol;

    let pool = state.tab === 'favorites'
      ? ALL.filter(r => isFav(r))
      : ALL;

    const rows = pool.filter(r => {
      if (state.stop    && r.target_stop   !== state.stop)   return false;
      if (state.line    && r.line          !== state.line)    return false;
      if (state.service && r.service_label !== state.service) return false;
      if (dirNrm && !normalize(r.direction).includes(dirNrm)) return false;
      if (txtNrm) {
        const bag = normalize([r.stop, r.target_stop, r.direction, r.line, r.network, r.service_label].join(' '));
        if (!bag.includes(txtNrm)) return false;
      }
      if (tTime !== null && !inRange(r.time_minutes, tTime, tol)) return false;

      if (state.tab === 'now') {
        if (!inRange(r.time_minutes, n, 5)) return false;
      }
      if (state.tab === 'morning') {
        if (r.time_minutes < MORNING_START || r.time_minutes > MORNING_END) return false;
      }
      if (state.tab === 'evening') {
        if (r.time_minutes < EVENING_START || r.time_minutes > EVENING_END) return false;
      }
      return true;
    });

    state.filtered = rows;
    renderResults(rows, n);
    updateTabCounts(n);
    updateNextBus();

    /* Barre résultat */
    const tabLabels = { now: 'Prochains ±5 min', morning: 'Matin 07:15–08:15', evening: 'Soir 17:40–19:00', favorites: 'Favoris', all: 'Tous les horaires' };
    $('resultInfo').textContent = `${rows.length} passage(s) -- ${tabLabels[state.tab] || ''}`;
  }

  function resetFilters() {
    Object.assign(state, { stop:'', line:'', direction:'', service:'', timeTarget:'', timeTol:5, search:'' });
    ['globalSearch','directionFilter','timeFilter'].forEach(id => { $( id).value = ''; });
    ['stopFilter','lineFilter','serviceFilter'].forEach(id => { $(id).value = ''; });
    $('timeTolerance').value = '5';
    saveState();
    applyFilters();
  }

  /* ===== Rendu résultats ===== */
  function renderResults(rows, n) {
    if (!rows.length) {
      $('results').innerHTML = emptyForTab(state.tab, n);
      return;
    }
    /* Grouper par arrêt */
    const groups = new Map();
    for (const r of rows) {
      const key = r.target_stop || r.stop;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }
    $('results').innerHTML = [...groups.entries()].map(([stop, list]) => renderGroup(stop, list, n)).join('');
  }

  function renderGroup(stop, list, n) {
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

  function renderCard(r, n) {
    const diff  = r.time_minutes - n;
    const isNow  = Math.abs(diff) <= 2;
    const isSoon = Math.abs(diff) <= 5 && !isNow;
    const cls   = isNow ? 'is-now' : isSoon ? 'is-soon' : '';
    const { text: cdText, cls: cdCls } = countdown(diff);
    const lineCls = r.network === 'AVL' ? 'badge-avl' : 'badge-rgtr';
    const fav   = isFav(r);
    const key   = favKey(r);

    let periodBadge = '';
    if (isNow)                         periodBadge = '<span class="badge badge-now">Now</span>';
    else if (r.period === 'morning_alert') periodBadge = '<span class="badge badge-morning" title="07:15–08:15">Matin</span>';
    else if (r.period === 'evening_alert') periodBadge = '<span class="badge badge-evening" title="17:40–19:00">Soir</span>';

    const shareBtn = (navigator.share || navigator.clipboard)
      ? `<button class="share-btn" data-action="share" aria-label="Partager" title="Partager" type="button">⬆</button>`
      : '';

    return `<article class="bus-card ${cls}" data-minutes="${r.time_minutes}" data-key="${escapeHtml(key)}" aria-label="Ligne ${escapeHtml(r.line)} à ${escapeHtml(r.time)}">
      <div class="card-time">
        <span class="card-time-value">${escapeHtml(r.time)}</span>
        <span class="card-countdown ${cdCls}">${escapeHtml(cdText)}</span>
      </div>
      <div class="card-info">
        <div class="card-badges">
          <span class="badge ${lineCls}">${escapeHtml(r.network)} ${escapeHtml(r.line)}</span>
          ${periodBadge}
        </div>
        <div class="card-direction">${escapeHtml(r.direction)}</div>
        <div class="card-meta">${escapeHtml(r.stop)} · ${escapeHtml(r.service_label || 'Selon PDF')}</div>
      </div>
      <div class="card-actions">
        <button class="fav-btn${fav ? ' is-fav' : ''}" data-action="fav" aria-label="${fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}" title="Favori" type="button">${fav ? '★' : '☆'}</button>
        ${shareBtn}
      </div>
    </article>`;
  }

  /* ===== Mise à jour countdowns sans re-rendu ===== */
  function refreshCountdowns() {
    const n = nowMin();
    document.querySelectorAll('.bus-card[data-minutes]').forEach(card => {
      const m    = Number(card.dataset.minutes);
      const diff = m - n;
      const cdEl = card.querySelector('.card-countdown');
      if (cdEl) {
        const { text, cls } = countdown(diff);
        cdEl.textContent = text;
        cdEl.className   = `card-countdown ${cls}`;
      }
      const isNow  = Math.abs(diff) <= 2;
      const isSoon = Math.abs(diff) <= 5 && !isNow;
      card.classList.toggle('is-now',  isNow);
      card.classList.toggle('is-soon', isSoon);
    });
  }

  /* ===== Horloge ===== */
  let lastMin = -1;
  function tick() {
    $('clock').textContent = nowTime();
    const n = nowMin();
    /* Mise à jour de la puce "N bus ±5 min" */
    $('nowChip').textContent = `${ALL.filter(r => inRange(r.time_minutes, n, 5)).length} bus ±5 min`;
    /* Countdown sur les cards */
    refreshCountdowns();
    /* Refresh complet chaque nouvelle minute */
    if (n !== lastMin) {
      lastMin = n;
      checkNotifications(n);
      if (state.tab === 'now') applyFilters();
      else updateNextBus();
    }
  }

  /* ===== Online / Offline ===== */
  function updateOnlineStatus() {
    const bar = $('statusBar');
    const msg = $('statusBarMsg');
    if (!navigator.onLine) {
      msg.textContent = '⚡ Mode hors-ligne -- données locales';
      bar.hidden = false;
    } else {
      bar.hidden = true;
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
            $('statusBar').hidden    = false;
            $('statusBarMsg').textContent = '🔄 Mise à jour disponible';
            const btn = $('updateBtn');
            btn.hidden = false;
            btn.onclick = () => { worker.postMessage({ type: 'SKIP_WAITING' }); location.reload(); };
          }
        });
      });
    }).catch(() => {});
  }

  /* ===== PWA Install ===== */
  function initInstall() {
    let deferred = null;
    window.addEventListener('beforeinstallprompt', ev => {
      ev.preventDefault();
      deferred = ev;
      $('installBtn').hidden = false;
    });
    $('installBtn').addEventListener('click', async () => {
      if (!deferred) return;
      deferred.prompt();
      await deferred.userChoice;
      deferred = null;
      $('installBtn').hidden = true;
    });
  }

  /* ===== Export CSV ===== */
  function exportCsv() {
    const cols = ['line','network','stop','target_stop','direction','time','period','service_label','course','source_pdf','page'];
    const csv  = [cols.join(';')]
      .concat(state.filtered.map(r => cols.map(c => `"${String(r[c] ?? '').replace(/"/g,'""')}"`).join(';')))
      .join('\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })),
      download: 'bus-horaires.csv',
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  /* ===== Notifications locales ===== */
  const notif = {
    enabled:        false,
    notifiedBuses:  new Set(),  // keys des bus déjà notifiés ce jour
    morningFired:   false,
    eveningFired:   false,
    lastDay:        -1,
  };

  /* Toast interne (fallback si Notification API refusée) */
  let toastTimer = null;
  function showToast(msg) {
    let el = document.querySelector('.notif-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'notif-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 4000);
  }

  function fireNotif(title, body, tag) {
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: 'assets/icon-192.png', tag, renotify: true });
      } catch (_) { showToast(title + ' — ' + body); }
    } else {
      showToast(title + ' — ' + body);
    }
  }

  async function requestNotifPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied')  return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }

  function updateNotifBtn() {
    const btn = $('notifBtn');
    if (!btn) return;
    btn.classList.toggle('notif-on', notif.enabled);
    btn.setAttribute('aria-pressed', String(notif.enabled));
    btn.title = notif.enabled ? 'Notifications activées (cliquer pour désactiver)' : 'Activer les notifications';
  }

  async function toggleNotifications() {
    if (notif.enabled) {
      notif.enabled = false;
      localStorage.setItem('bus-notif', '0');
      updateNotifBtn();
      showToast('Notifications désactivées');
      return;
    }
    const ok = await requestNotifPermission();
    notif.enabled = true;
    localStorage.setItem('bus-notif', '1');
    updateNotifBtn();
    if (ok) {
      showToast('Notifications activées');
    } else {
      showToast('Notifications activées (toast interne — permission refusée)');
    }
  }

  /* Réinitialiser le suivi chaque nouveau jour */
  function resetDailyTracking(day) {
    if (day !== notif.lastDay) {
      notif.notifiedBuses.clear();
      notif.morningFired = false;
      notif.eveningFired = false;
      notif.lastDay = day;
    }
  }

  /* Appelé à chaque changement de minute dans tick() */
  function checkNotifications(n) {
    if (!notif.enabled) return;
    const d   = new Date();
    const day = d.getDate();
    resetDailyTracking(day);

    /* Alerte matin 07:15 */
    if (n === MORNING_START && !notif.morningFired) {
      notif.morningFired = true;
      const nb = morningAll.filter(r => !state.stop || r.target_stop === state.stop).length;
      fireNotif('🌅 Alerte matin', `${nb} bus disponibles — 07:15 à 08:15`, 'alert-morning');
    }

    /* Alerte soir 17:40 */
    if (n === EVENING_START && !notif.eveningFired) {
      notif.eveningFired = true;
      const nb = eveningAll.filter(r => !state.stop || r.target_stop === state.stop).length;
      fireNotif('🌆 Alerte soir', `${nb} bus disponibles — 17:40 à 19:00`, 'alert-evening');
    }

    /* Bus favoris dans ±5 min */
    if (state.favorites.length) {
      const pool = ALL.filter(r => isFav(r) && inRange(r.time_minutes, n, 5));
      for (const r of pool) {
        const key = r.line + '|' + r.time + '|' + r.target_stop;
        if (notif.notifiedBuses.has(key)) continue;
        notif.notifiedBuses.add(key);
        const diff = r.time_minutes - n;
        const when = diff <= 1 ? 'maintenant' : 'dans ' + diff + ' min';
        fireNotif(
          'Bus ' + r.line + ' (' + when + ')',
          r.time + ' — ' + r.target_stop + '\n' + r.direction,
          'bus-' + key
        );
      }
    }
  }

  /* ===== États vides ===== */
  function emptyHtml(icon, title, msg) {
    return `<div class="empty-state"><div class="empty-icon">${icon}</div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(msg)}</p></div>`;
  }

  function emptyForTab(tab, n) {
    if (tab === 'now')       return emptyHtml('🕐', 'Pas de bus dans \xB15 min',   `Il est ${minToHHMM(n)}. Essayez l'onglet Tout ou un autre arr\xeat.`);
    if (tab === 'morning')   return emptyHtml('🌅', 'Aucun r\xe9sultat matin',     "Essayez de retirer un filtre de ligne ou d'arr\xeat.");
    if (tab === 'evening')   return emptyHtml('🌆', 'Aucun r\xe9sultat soir',      "Essayez de retirer un filtre de ligne ou d'arr\xeat.");
    if (tab === 'favorites') return emptyHtml('★',  'Aucun favori',                "Cliquez sur ☆ sur une carte pour l'ajouter aux favoris.");
    return                   emptyHtml('🔍', 'Aucun r\xe9sultat',                  "\xC9largissez les filtres ou augmentez la tol\xe9rance horaire.");
  }

  /* ===== Init principal ===== */
  function init() {
    initTheme();
    loadState();

    /* Sélects */
    populateSelect($('stopFilter'),    unique(ALL.map(r => r.target_stop)),  'Tous les arrêts');
    populateSelect($('lineFilter'),    unique(ALL.map(r => r.line)),         'Toutes les lignes');
    populateSelect($('serviceFilter'), unique(ALL.map(r => r.service_label)), 'Tous les services');
    if (state.stop) $('stopFilter').value = state.stop;

    /* Onglets */
    document.querySelectorAll('.tab').forEach(btn => {
      const active = btn.dataset.tab === state.tab;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
      btn.addEventListener('click', () => {
        state.tab = btn.dataset.tab;
        document.querySelectorAll('.tab').forEach(b => {
          b.classList.toggle('active', b === btn);
          b.setAttribute('aria-selected', String(b === btn));
        });
        saveState();
        applyFilters();
      });
    });

    /* Chip du jour */
    const di = getDayInfo();
    $('dayChip').textContent = `${di.icon} Aujourd'hui : ${di.label}`;

    /* Recherche globale */
    const doSearch = debounce(() => {
      const q = $('globalSearch').value;
      state.search = q;
      if (q) { addHistory(q); renderHistory(); }
      else    { $('searchHistory').hidden = true; }
      applyFilters();
    }, 250);
    $('globalSearch').addEventListener('input', doSearch);
    $('globalSearch').addEventListener('focus', () => { if (state.history.length) renderHistory(); });
    document.addEventListener('click', e => {
      if (!e.target.closest('.search-wrap')) $('searchHistory').hidden = true;
    });

    /* Filtres avancés */
    $('stopFilter').addEventListener('change', e => { state.stop = e.target.value; saveState(); applyFilters(); });
    $('lineFilter').addEventListener('change', e => { state.line = e.target.value; applyFilters(); });
    $('serviceFilter').addEventListener('change', e => { state.service = e.target.value; applyFilters(); });
    $('directionFilter').addEventListener('input', debounce(e => { state.direction = e.target.value; applyFilters(); }, 250));
    $('timeFilter').addEventListener('change', e => { state.timeTarget = e.target.value; applyFilters(); });
    $('timeTolerance').addEventListener('change', e => { state.timeTol = Number(e.target.value); applyFilters(); });
    $('resetBtn').addEventListener('click', resetFilters);
    $('exportBtn').addEventListener('click', exportCsv);

    /* Délégation des actions sur les cards (fav + share) */
    $('results').addEventListener('click', e => {
      const btn  = e.target.closest('[data-action]');
      if (!btn) return;
      const card = btn.closest('.bus-card');
      if (!card) return;
      const r = findRecord(card);
      if (!r) return;
      if (btn.dataset.action === 'fav')   toggleFav(r);
      if (btn.dataset.action === 'share') shareCard(r);
    });

    /* Notifications */
    notif.enabled = localStorage.getItem('bus-notif') === '1';
    updateNotifBtn();
    $('notifBtn').addEventListener('click', toggleNotifications);

    /* Thème */
    $('themeToggle').addEventListener('click', toggleTheme);

    /* Online / Offline */
    updateOnlineStatus();
    window.addEventListener('online',  updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    /* PWA */
    initInstall();
    initSW();

    /* Rendu initial */
    applyFilters();

    /* Horloge : 1 tick/seconde */
    tick();
    setInterval(tick, 1000);
  }

  /* Retrouver l'objet record depuis une card DOM */
  function findRecord(card) {
    const key     = card.dataset.key;
    const minutes = Number(card.dataset.minutes);
    return ALL.find(r => favKey(r) === key && r.time_minutes === minutes) || null;
  }

  init();
})();
