'use strict';
/* Service worker minimale per l'installabilità (PWA) di "Presidente · Serie A".
   Cache-first sui file statici versionati (?v=), network-first su index.html così un
   deploy nuovo si vede subito (coerente con i meta no-cache già in index.html) e resta
   comunque disponibile offline se la rete manca. */
const CACHE = 'presidente-serie-a-v12';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './errors.js',
  './data.js',
  './rosters.js',
  './sim.js',
  './ui.js',
  './sfx.js',
  './manifest.json',
  './icon.webp',
  './logo-desktop.webp',
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
  const url = new URL(req.url);
  // manifest.json e icon.webp non hanno una query ?v= (a differenza di script/css), quindi un
  // deploy non cambia il loro URL: vanno trattati come l'HTML, altrimenti Chrome può leggere per
  // il prompt "Installa app" un'icona/manifest vecchi rimasti nella cache HTTP di Altervista.
  const isUnversionedAsset = url.pathname.endsWith('/manifest.json') || url.pathname.endsWith('/icon.webp');
  if (isHTML || isUnversionedAsset) {
    // cache:'no-store' bypassa del tutto la cache HTTP del browser: senza, Altervista non
    // manda un header Cache-Control reale e fetch() può comunque restituire una copia vecchia
    // anche se qui "proviamo" ad andare in rete, lasciando l'app installata bloccata su una
    // versione superata finché non si reinstalla a mano.
    ev.respondWith(
      fetch(req, { cache: 'no-store' }).then((res) => { caches.open(CACHE).then((c) => c.put(req, res.clone())); return res; })
        .catch(() => caches.match(req).then((c) => c || (isHTML ? caches.match('./index.html') : undefined)))
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
