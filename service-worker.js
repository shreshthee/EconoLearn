// FILE: service-worker.js
// EconoLearn – Service Worker (v11)
const VERSION = 'v11';
const STATIC_CACHE = `econolearn-static-${VERSION}`;

// Only truly-static assets (do NOT cache main.jsx or questions.json)
const STATIC_ASSETS = [
  './',
  './index.html?v=11',
  './favicon-16.png',
  './favicon-32.png',
  './apple-touch-icon.png',
  './ganesh.png',
  './manifest.webmanifest?v=11'
];

// Install: precache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== STATIC_CACHE ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1) HTML navigations: network-first (fallback to cached shell)
  if (event.request.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html?v=11'))
    );
    return;
  }

  // 2) Dynamic content: always fresh (no-store)
  if (url.pathname.endsWith('questions.json') || url.pathname.endsWith('main.jsx')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  // 3) Same-origin static: cache-first (populate on miss)
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) =>
        cached ||
        fetch(event.request).then((resp) => {
          if (event.request.method === 'GET' && resp.ok) {
            const clone = resp.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(event.request, clone));
          }
          return resp;
        })
      )
    );
    return;
  }

  // 4) Cross-origin: network
  event.respondWith(fetch(event.request));
});
