'use strict'

// ── DOM ────────────────────────────────────────────────────
const $  = id => document.getElementById(id)
const el = {
  sujet:       $('sujetInput'),
  charCount:   $('charCount'),
  kw1:         $('kw1'),
  kw2:         $('kw2'),
  kw3:         $('kw3'),
  ton:         $('tonSelect'),
  langue:      $('langueSelect'),
  secAbout:    $('secAbout'),
  secTS:       $('secTimestamps'),
  secChaine:   $('secChaine'),
  secProduits: $('secProduits'),
  secCTA:      $('secCTA'),
  secLinks:    $('secLinks'),
  generateBtn: $('generateBtn'),
  btnText:     $('btnText'),
  btnIcon:     $('btnIcon'),
  results:     $('resultsWrap'),
  titresBox:   $('titresBox'),
  descBox:     $('descBox'),
  descWC:      $('descWC'),
  densityBox:  $('densityBox'),
  tagsChips:   $('tagsChips'),
  tagsPlain:   $('tagsPlain'),
  hashChips:     $('hashtagsChips'),
  hashPlain:     $('hashtagsPlain'),
  tagsCount:     $('tagsCount'),
  hashCount:     $('hashCount'),
  copyDesc:      $('copyDesc'),
  copyTags:      $('copyTags'),
  copyHash:      $('copyHashtags'),
  exportBtn:     $('exportBtn'),
  resetBtn:      $('resetBtn'),
  toast:         $('toast'),
  themeToggle:   $('themeToggle'),
  historyCard:   $('historyCard'),
  historyList:   $('historyList'),
  installBanner: $('installBanner'),
  installBtn:    $('installBtn'),
  dismissBtn:    $('dismissBtn'),
}

let lastResult = null

// ── THÈME ──────────────────────────────────────────────────
;(function initTheme() {
  const saved = localStorage.getItem('yt-theme') || 'light'
  applyTheme(saved)
})()

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  el.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙'
  localStorage.setItem('yt-theme', theme)
}

el.themeToggle.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme')
  applyTheme(cur === 'dark' ? 'light' : 'dark')
})

// ── COMPTEUR CHARS ─────────────────────────────────────────
el.sujet.addEventListener('input', () => {
  const n = el.sujet.value.length
  el.charCount.textContent = `${n} / 150`
  el.charCount.style.color = n > 130 ? '#ef4444' : ''
})

// ── GÉNÉRATION ─────────────────────────────────────────────
el.generateBtn.addEventListener('click', handleGenerate)
el.sujet.addEventListener('keydown', e => { if (e.key === 'Enter') handleGenerate() })

async function handleGenerate() {
  const sujet = el.sujet.value.trim()
  if (!sujet) {
    el.sujet.style.borderColor = '#ef4444'
    el.sujet.focus()
    setTimeout(() => { el.sujet.style.borderColor = '' }, 1500)
    return
  }

  el.generateBtn.disabled = true
  el.btnText.textContent = 'Génération...'
  el.btnIcon.classList.add('spinning')

  await new Promise(r => setTimeout(r, 500))

  const sections = {
    about:     el.secAbout.checked,
    timestamps: el.secTS.checked,
    chaine:    el.secChaine.checked,
    produits:  el.secProduits.checked,
    cta:       el.secCTA.checked,
    liens:     el.secLinks.checked,
  }
  const keywords = [el.kw1.value, el.kw2.value, el.kw3.value].filter(k => k.trim())

  const result = Engine.generate(sujet, el.ton.value, el.langue.value, sections, keywords)

  el.generateBtn.disabled = false
  el.btnText.textContent = 'Régénérer'
  el.btnIcon.classList.remove('spinning')

  if (!result) return

  lastResult = result
  render(result)
  saveHistory(result)
}

// ── RENDU ──────────────────────────────────────────────────
const BADGE_MAP = {
  choc:      { cls: 'badge-choc',     label: '💥 Choc' },
  liste:     { cls: 'badge-liste',    label: '📋 Liste' },
  curiosite: { cls: 'badge-curiosite',label: '🤔 Curiosité' },
  question:  { cls: 'badge-question', label: '❓ Question' },
  nombre:    { cls: 'badge-nombre',   label: '🔢 Nombre' },
}

function render(r) {
  // Titres
  el.titresBox.innerHTML = ''
  r.titles.forEach(({ type, titre }) => {
    const b = BADGE_MAP[type] || {}
    const div = document.createElement('div')
    div.className = 'titre-item'
    div.innerHTML = `
      <span class="titre-text">${esc(titre)}</span>
      <span class="titre-badge ${b.cls}">${b.label}</span>
      <button class="btn-copy-titre" data-val="${esc(titre)}">📋 Copier</button>
    `
    el.titresBox.appendChild(div)
  })

  // Description
  el.descBox.value = r.description
  const wc = r.description.trim().split(/\s+/).filter(Boolean).length
  el.descWC.textContent = `${wc} mots`

  // Densité
  el.densityBox.innerHTML = ''
  if (r.density && r.density.length) {
    r.density.forEach(d => {
      const item = document.createElement('div')
      item.className = 'density-item'
      item.innerHTML = `
        <span class="density-kw">${esc(d.keyword)}</span>
        <span class="density-count ${d.good ? 'density-good' : 'density-bad'}">${d.count}x</span>
        <span class="density-label">${d.good ? '✅ Bon' : '⚠️ Ajouter'}</span>
      `
      el.densityBox.appendChild(item)
    })
  }

  // Tags
  el.tagsChips.innerHTML = ''
  el.tagsPlain.textContent = r.tags.join(', ')
  el.tagsCount.textContent = r.tags.length
  r.tags.forEach(tag => {
    const span = document.createElement('span')
    span.className = 'chip'
    span.setAttribute('role', 'listitem')
    span.textContent = tag
    el.tagsChips.appendChild(span)
  })

  // Hashtags
  el.hashChips.innerHTML = ''
  el.hashPlain.textContent = r.hashtags.join(' ')
  el.hashCount.textContent = r.hashtags.length
  r.hashtags.forEach(ht => {
    const span = document.createElement('span')
    span.className = 'chip chip-ht'
    span.setAttribute('role', 'listitem')
    span.textContent = ht
    el.hashChips.appendChild(span)
  })

  // Afficher
  el.results.classList.remove('hidden')
  setTimeout(() => {
    el.results.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 100)
}

// ── COPIE ──────────────────────────────────────────────────
function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    showToast()
    if (!btn) return
    const orig = btn.textContent
    btn.textContent = '✅ Copié !'
    btn.classList.add('copied')
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied') }, 2000)
  }).catch(() => {
    const ta = document.createElement('textarea')
    ta.value = text
    Object.assign(ta.style, { position:'fixed', opacity:'0' })
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    showToast()
  })
}

// Boutons copier titres (délégation)
el.titresBox.addEventListener('click', e => {
  const btn = e.target.closest('.btn-copy-titre')
  if (btn) copyText(btn.dataset.val, btn)
})

el.copyDesc.addEventListener('click',     () => copyText(el.descBox.value, el.copyDesc))
el.copyTags.addEventListener('click',     () => copyText(el.tagsPlain.textContent, el.copyTags))
el.copyHash.addEventListener('click',     () => copyText(el.hashPlain.textContent, el.copyHash))

// ── TOAST ──────────────────────────────────────────────────
function showToast() {
  el.toast.classList.add('show')
  setTimeout(() => el.toast.classList.remove('show'), 2000)
}

// ── EXPORT JSON ────────────────────────────────────────────
el.exportBtn.addEventListener('click', () => {
  if (!lastResult) return
  const blob = new Blob([JSON.stringify(lastResult, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `yt-seo-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
})

// ── RESET ──────────────────────────────────────────────────
el.resetBtn.addEventListener('click', () => {
  el.sujet.value = ''
  el.charCount.textContent = '0 / 150'
  el.results.classList.add('hidden')
  el.btnText.textContent = 'Générer'
  lastResult = null
  el.sujet.focus()
  window.scrollTo({ top: 0, behavior: 'smooth' })
})

// ── HISTORIQUE ─────────────────────────────────────────────
const HK = 'yt-seo-history'

function saveHistory(r) {
  let h = loadHistory().filter(x => x.sujet !== r.sujet)
  h.unshift({ sujet: r.sujet, ton: r.ton, langue: r.langue, timestamp: r.timestamp })
  h = h.slice(0, 5)
  localStorage.setItem(HK, JSON.stringify(h))
  renderHistory(h)
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HK)) || [] } catch { return [] }
}

function renderHistory(h) {
  if (!h || !h.length) { el.historyCard.classList.add('hidden'); return }
  el.historyCard.classList.remove('hidden')
  el.historyList.innerHTML = ''
  const TONS  = { professionnel:'👔', decontracte:'😎', humoristique:'😄' }
  const LANGS = { fr:'🇫🇷', en:'🇬🇧' }
  h.forEach(item => {
    const li = document.createElement('li')
    li.className = 'history-item'
    const d = new Date(item.timestamp).toLocaleString('fr-FR',{ day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit' })
    li.innerHTML = `<span class="history-text">${esc(item.sujet)}</span>
                    <span class="history-meta">${TONS[item.ton]||''} ${LANGS[item.langue]||''} · ${d}</span>`
    li.addEventListener('click', () => {
      el.sujet.value = item.sujet
      el.charCount.textContent = `${item.sujet.length} / 150`
      el.ton.value    = item.ton
      el.langue.value = item.langue
      handleGenerate()
    })
    el.historyList.appendChild(li)
  })
}

// ── UTILS ──────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;')
}

// ── PWA INSTALL ────────────────────────────────────────────
let deferredPrompt = null

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault()
  deferredPrompt = e
  if (!localStorage.getItem('pwa-dismissed')) {
    el.installBanner.classList.remove('hidden')
  }
})

el.installBtn && el.installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  el.installBanner.classList.add('hidden')
})

el.dismissBtn && el.dismissBtn.addEventListener('click', () => {
  el.installBanner.classList.add('hidden')
  localStorage.setItem('pwa-dismissed', '1')
})

// ── INIT ───────────────────────────────────────────────────
renderHistory(loadHistory())
el.sujet.focus()
