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

  /* ===== Plages horaires ===== */
  const MORNING_START = 7 * 60 + 15;
  const MORNING_END   = 8 * 60 + 15;
  const EVENING_START = 17 * 60 + 40;
  const EVENING_END   = 19 * 60;

  /* ===== Detection direction trajet ===== */
  /* Direction -> destination = partie apres le dernier fleche */
  const dest = dir => (dir || '').split(/→|->/).pop().trim();

  /* Matin = bus qui va vers la ville (LUX, HOWALD, FINDEL, Kirchberg...) */
  const CITY_RE  = /LUX|HOWALD|FINDEL|Kirchberg|Hamilius|Gare|Steinsel|Centre/i;
  /* Soir  = bus qui repart vers Mamer / ouest */
  const MAMER_RE = /STEINFORT|EISCHEN|MERSCH|TUNTANGE|SCHWEBACH|REDANGE|MESSANCY|Belle.Etoile/i;

  const isCityBound  = dir => CITY_RE.test(dest(dir));
  const isMamerBound = dir => MAMER_RE.test(dest(dir));

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

  /* ===== Etat ===== */
  const state = {
    tab: 'now', stop: '', line: '', direction: '', service: '',
    timeTarget: '', timeTol: 5, search: '',
    liveStop: '', liveTol: 10,
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
      if (Array.isArray(s.favorites)) state.favorites = s.favorites;
      if (Array.isArray(s.history))   state.history   = s.history.slice(0, 5);
    } catch (_) {}
    const urlTab = new URLSearchParams(location.search).get('tab');
    if (urlTab && ['now','morning','evening','favorites','all','live'].includes(urlTab)) state.tab = urlTab;
  }

  function saveState() {
    try { localStorage.setItem('bus-pwa', JSON.stringify({ tab: state.tab, stop: state.stop, liveTol: state.liveTol, favorites: state.favorites, history: state.history })); } catch (_) {}
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

  /* ===== Jour ===== */
  function getDayInfo() {
    const d = new Date().getDay();
    if (d === 0) return { label: 'Dimanche & jours feries', icon: '🔵' };
    if (d === 6) return { label: 'Samedi',                  icon: '🟡' };
    return               { label: 'Lundi – Vendredi',   icon: '🟢' };
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
  const favKey = r => `${r.line}|${r.target_stop}|${r.direction}`;
  const isFav  = r => state.favorites.some(f => f.key === favKey(r));

  function toggleFav(r) {
    const key = favKey(r);
    const idx = state.favorites.findIndex(f => f.key === key);
    if (idx >= 0) {
      state.favorites.splice(idx, 1);
    } else {
      state.favorites.unshift({ key, line: r.line, target_stop: r.target_stop, direction: r.direction, network: r.network, stop: r.stop });
    }
    saveState();
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
    el.querySelectorAll('.history-item').forEach(item => {
      const pick = () => { $('globalSearch').value = item.dataset.q; state.search = item.dataset.q; el.hidden = true; applyFilters(); };
      item.addEventListener('click', pick);
      item.addEventListener('keydown', e => { if (e.key === 'Enter') pick(); });
    });
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
    const pool = ALL.filter(r => {
      if (state.stop && r.target_stop !== state.stop) return false;
      if (state.line && r.line         !== state.line) return false;
      const diff = r.time_minutes - n;
      return diff >= -2 && diff <= 120;
    });
    const card = $('nextBusCard'), body = $('nextBusBody');
    if (!pool.length) {
      card.classList.remove('has-bus');
      body.innerHTML = '<span style="color:var(--text3);font-size:.85rem">Aucun bus dans les 2 prochaines heures</span>';
      return;
    }
    const next = pool.reduce((a, b) => Math.abs(b.time_minutes - n) < Math.abs(a.time_minutes - n) ? b : a);
    const { text: cdText } = countdown(next.time_minutes - n);
    const lineCls = next.network === 'AVL' ? 'badge-avl' : next.network === 'CFL' ? 'badge-cfl' : 'badge-rgtr';
    card.classList.add('has-bus');
    body.innerHTML =
      `<span class="nb-time">${escapeHtml(next.time)}</span>` +
      `<span style="margin:0 8px;color:var(--text3)">·</span>` +
      `<span class="badge ${lineCls}">${escapeHtml(next.network)} ${escapeHtml(next.line)}</span>` +
      `<span style="margin-left:7px;font-size:.875rem;font-weight:600">${escapeHtml(next.direction)}</span>` +
      `<div class="nb-meta">${escapeHtml(next.target_stop)}${cdText ? ' · ' + cdText : ''}</div>`;
  }

  /* ===== Selects ===== */
  function populateSelect(el, values, allLabel) {
    const saved = el.value;
    el.innerHTML = `<option value="">${escapeHtml(allLabel)}</option>` +
      values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
    if (saved && values.includes(saved)) el.value = saved;
  }

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

    let pool = state.tab === 'favorites' ? ALL.filter(r => isFav(r)) : ALL;

    const rows = pool.filter(r => {
      if (state.stop    && r.target_stop   !== state.stop)    return false;
      if (state.line    && r.line          !== state.line)     return false;
      if (state.service && r.service_label !== state.service)  return false;
      if (dirNrm && !normalize(r.direction).includes(dirNrm)) return false;
      if (txtNrm) { const bag = normalize([r.stop, r.target_stop, r.direction, r.line, r.network, r.service_label].join(' ')); if (!bag.includes(txtNrm)) return false; }
      if (tTime !== null && !inRange(r.time_minutes, tTime, tol)) return false;
      if (state.tab === 'now')     { if (!inRange(r.time_minutes, n, 5)) return false; }
      if (state.tab === 'morning') { if (r.time_minutes < MORNING_START || r.time_minutes > MORNING_END) return false; }
      if (state.tab === 'evening') { if (r.time_minutes < EVENING_START || r.time_minutes > EVENING_END) return false; }
      return true;
    });

    state.filtered = rows;
    renderResults(rows, n);
    updateTabCounts(n);
    updateNextBus();
    const tabLabels = { now: 'Prochains \xB15 min', morning: 'Matin 07:15–08:15', evening: 'Soir 17:40–19:00', favorites: 'Favoris', all: 'Tous les horaires', live: 'Live \xB1' + state.liveTol + ' min' };
    $('resultInfo').textContent = `${rows.length} passage(s) — ${tabLabels[state.tab] || ''}`;
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

  /* ===== Onglet Matin — sections Train + Aller + Connexion + Autres ===== */
  function renderMorningJourney(rows, n) {
    /* Train L50 : Mamer Gare => Luxembourg Gare Centrale */
    const train = rows.filter(r => r.network === 'CFL' && STOP_MAMER_TRAIN.includes(r.target_stop));
    /* Aller : Mamer => vers la ville */
    const aller = rows.filter(r => STOP_MAMER.includes(r.target_stop) && isCityBound(r.direction));
    /* Connexion : Belle-Etoile AVL 10 => vers Bourmicht/Gare/Hamilius */
    const connexion = rows.filter(r => STOP_BELLE_AVL.includes(r.target_stop) && r.line === '10');
    /* Autres : tout le reste */
    const autresSet = new Set([...train, ...aller, ...connexion]);
    const autres = rows.filter(r => !autresSet.has(r));

    let html = '';
    if (train.length) html += journeySection('train', '\u{1F686} Train L50 — Mamer → Luxembourg Gare Centrale', train, n);
    if (aller.length) html += journeySection('aller', '\u{1F535} Aller — Mamer → Ville (bus)', aller, n);
    if (connexion.length) html += journeySection('connexion', '\u{1F517} Connexion — Belle-Étoile → Bourmicht / Gare', connexion, n);
    if (autres.length) html += journeySection('autres', 'Autres passages matin', autres, n);
    if (!html) html = emptyForTab('morning', n);
    return html;
  }

  /* ===== Onglet Soir — sections Train + Depart + Retour + Autres ===== */
  function renderEveningJourney(rows, n) {
    /* Train L50 : Luxembourg Gare Centrale => Mamer */
    const train = rows.filter(r => r.network === 'CFL' && STOP_LUX_TRAIN.includes(r.target_stop));
    /* Depart : Bourmicht/Gare/Hamilius (AVL 10 vers Belle-Etoile) */
    const depart = rows.filter(r => STOP_CITY_AVL.includes(r.target_stop) && r.line === '10');
    /* Retour : Belle-Etoile RGTR => vers Mamer */
    const retour = rows.filter(r => STOP_BELLE_RGTR.includes(r.target_stop) && isMamerBound(r.direction));
    const autresSet = new Set([...train, ...depart, ...retour]);
    const autres = rows.filter(r => !autresSet.has(r));

    let html = '';
    if (train.length) html += journeySection('train', '\u{1F686} Train L50 — Luxembourg Gare Centrale → Mamer', train, n);
    if (depart.length) html += journeySection('connexion', '\u{1F535} Départ — Ville → Belle-Étoile (AVL 10)', depart, n);
    if (retour.length) html += journeySection('retour', '\u{1F517} Retour — Belle-Étoile → Mamer', retour, n);
    if (autres.length) html += journeySection('autres', 'Autres passages soir', autres, n);
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
    }).join('');

    /* Boutons tolerance */
    const tolBtns = [5, 10, 30].map(t =>
      `<button class="live-tol-btn${state.liveTol === t ? ' active' : ''}" data-action="live-tol" data-tol="${t}" type="button">\xB1${t} min</button>`
    ).join('');

    /* Filtrage */
    const rows = ALL.filter(r => {
      if (state.liveStop && r.target_stop !== state.liveStop) return false;
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
      const lineCls = r.network === 'AVL' ? 'badge-avl' : r.network === 'CFL' ? 'badge-cfl' : 'badge-rgtr';
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

    return `<div class="live-board">
      <div class="live-controls">
        <div class="live-stops-scroll">${stopChips}</div>
        <div class="live-tol-row">${tolBtns}</div>
      </div>
      <div class="live-board-header">
        <span class="live-board-title">\u{1F4CD} ${escapeHtml(stopName)}</span>
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

    const lineCls = fav.network === 'AVL' ? 'badge-avl' : fav.network === 'CFL' ? 'badge-cfl' : 'badge-rgtr';
    return `<div class="fav-route-card" data-favkey="${escapeHtml(fav.key)}">
      <div class="fav-route-header">
        <div class="fav-route-info">
          <div class="card-badges" style="margin-bottom:6px">
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
    const lineCls = r.network === 'AVL' ? 'badge-avl' : r.network === 'CFL' ? 'badge-cfl' : 'badge-rgtr';
    const fav     = isFav(r);
    const key     = favKey(r);

    let periodBadge = '';
    if (isNow)                             periodBadge = '<span class="badge badge-now">Now</span>';
    else if (r.period === 'morning_alert') periodBadge = '<span class="badge badge-morning" title="07:15–08:15">Matin</span>';
    else if (r.period === 'evening_alert') periodBadge = '<span class="badge badge-evening" title="17:40–19:00">Soir</span>';

    const shareBtn = (navigator.share || navigator.clipboard)
      ? `<button class="share-btn" data-action="share" aria-label="Partager" title="Partager" type="button">⬆</button>` : '';

    return `<article class="bus-card ${cls}" data-minutes="${r.time_minutes}" data-fkey="${escapeHtml(key)}" aria-label="Ligne ${escapeHtml(r.line)} a ${escapeHtml(r.time)}">
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
        <div class="card-meta">${escapeHtml(r.stop)}${r.course ? ' · ' + escapeHtml(r.course) : ''} · ${escapeHtml(r.service_label || 'Selon PDF')}</div>
      </div>
      <div class="card-actions">
        <button class="fav-btn${fav ? ' is-fav' : ''}" data-action="fav" aria-label="${fav ? 'Retirer' : 'Ajouter aux favoris'}" title="Favori" type="button">${fav ? '★' : '☆'}</button>
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
    $('nowChip').textContent = `${ALL.filter(r => inRange(r.time_minutes, n, 5)).length} bus \xB15 min`;
    refreshCountdowns();
    if (n !== lastMin) {
      lastMin = n;
      checkNotifications(n);
      if (state.tab === 'now' || state.tab === 'live') applyFilters();
      else updateNextBus();
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
      const nb = morningAll.filter(r => !state.stop || r.target_stop === state.stop).length;
      fireNotif('\u{1F305} Alerte matin', `${nb} bus disponibles — 07:15 à 08:15`, 'alert-morning');
    }
    if (n === EVENING_START && !notif.eveningFired) {
      notif.eveningFired = true;
      const nb = eveningAll.filter(r => !state.stop || r.target_stop === state.stop).length;
      fireNotif('\u{1F306} Alerte soir', `${nb} bus disponibles — 17:40 à 19:00`, 'alert-evening');
    }
    if (state.favorites.length) {
      ALL.filter(r => isFav(r) && inRange(r.time_minutes, n, 5)).forEach(r => {
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
    }).catch(() => {});
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
        <div style="flex:1;min-width:0">
          <div class="stop-stat-name">${escapeHtml(s)}</div>
          <div style="font-size:.7rem;color:var(--text3);margin-top:2px">Lignes : ${escapeHtml(lines.join(' · '))}</div>
        </div>
        <div class="stop-stat-counts">
          <span class="stop-stat-pill">${counts[s] || 0} tot</span>
          ${morning_c[s] ? `<span class="stop-stat-pill" style="color:var(--yellow)">${morning_c[s]} mat</span>` : ''}
          ${evening_c[s] ? `<span class="stop-stat-pill" style="color:var(--red)">${evening_c[s]} soir</span>` : ''}
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

  function closePanel(id) { $(id).hidden = true; }

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
        state.tab = btn.dataset.tab;
        document.querySelectorAll('.tab').forEach(b => { b.classList.toggle('active', b === btn); b.setAttribute('aria-selected', String(b === btn)); });
        saveState(); applyFilters();
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

    /* Filtres */
    $('stopFilter').addEventListener('change', e => { state.stop = e.target.value; saveState(); applyFilters(); });
    $('lineFilter').addEventListener('change', e => { state.line = e.target.value; applyFilters(); });
    $('serviceFilter').addEventListener('change', e => { state.service = e.target.value; applyFilters(); });
    $('directionFilter').addEventListener('input', debounce(e => { state.direction = e.target.value; applyFilters(); }, 250));
    $('timeFilter').addEventListener('change', e => { state.timeTarget = e.target.value; applyFilters(); });
    $('timeTolerance').addEventListener('change', e => { state.timeTol = Number(e.target.value); applyFilters(); });
    $('resetBtn').addEventListener('click', resetFilters);
    $('stopsBtn').addEventListener('click', openStopsPanel);
    $('schedulesBtn').addEventListener('click', () => $('schedulesPanel').hidden = false);
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
    applyFilters();
    tick();
    setInterval(tick, 1000);
  }

  function findRecord(card) {
    const key = card.dataset.fkey, m = Number(card.dataset.minutes);
    return ALL.find(r => favKey(r) === key && r.time_minutes === m) || null;
  }

  init();
})();
