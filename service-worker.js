// FILE: service-worker.js
// EconoLearn – Service Worker (v10)
const VERSION = 'v10';
// EconoLearn – Service Worker (v11)
const VERSION = 'v11';
const STATIC_CACHE = `econolearn-static-${VERSION}`;

// Only truly-static assets (no main.jsx, no questions.json)
const STATIC_ASSETS = [
  './',
  './index.html',
  './favicon-16.png',
  './favicon-32.png',
  './apple-touch-icon.png',
  './ganesh.png',
  './manifest.webmanifest'
];

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate (clean old)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== STATIC_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1) HTML navigations: network-first so new deploy shows immediately
  if (event.request.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 2) Dynamic content: never cache
  // 2) Dynamic content: force fresh network (no-store)
  if (url.pathname.endsWith('questions.json') || url.pathname.endsWith('main.jsx')) {
    event.respondWith(fetch(event.request));
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  // 3) Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then(hit => hit || fetch(event.request))
  );
});
