'use strict';
/* Service worker minimale per l'installabilità (PWA) di "Presidente · Serie A".
   Cache-first sui file statici versionati (?v=), network-first su index.html così un
   deploy nuovo si vede subito (coerente con i meta no-cache già in index.html) e resta
   comunque disponibile offline se la rete manca. */
const CACHE = 'presidente-serie-a-v2';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './data.js',
  './sim.js',
  './ui.js',
  './sfx.js',
  './manifest.json',
  './icon.svg',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    ev.respondWith(
      fetch(req).then((res) => { caches.open(CACHE).then((c) => c.put(req, res.clone())); return res; })
        .catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
    );
    return;
  }
  ev.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      caches.open(CACHE).then((c) => c.put(req, res.clone()));
      return res;
    }).catch(() => cached))
  );
});
