/* ═══════════════════════════════════════════════════
   SERVICE WORKER — YouTube SEO Generator
   Cache-first strategy, full offline support
   ═══════════════════════════════════════════════════ */

'use strict'

const CACHE_NAME = 'yt-seo-v1'
const ASSETS = [
  './index.html',
  './style.css',
  './engine.js',
  './ui.js',
  './pwa.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
]

// ── INSTALL : mise en cache des ressources ─────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  )
})

// ── ACTIVATE : nettoyage des anciens caches ────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// ── FETCH : cache-first, fallback réseau ───────────────────
self.addEventListener('fetch', event => {
  // Ne gérer que les requêtes GET locales
  if (event.request.method !== 'GET') return
  if (!event.request.url.startsWith(self.location.origin)) return

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response
        const clone = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        return response
      })
    })
  )
})
