// EconoLearn - Service Worker (v7)
const CACHE_VERSION = 'v7';
const CACHE_NAME = `econolearn-cache-${CACHE_VERSION}`;
const ASSETS = [
  './',
  './index.html?v=7',
  './main.jsx?v=7',
  './questions.json?v=7',
  './ganesh.png',
  './favicon-32.png',
  './favicon-16.png',
  './apple-touch-icon.png'
];

// install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(()=>self.skipWaiting())
  );
});

// activate: clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k.startsWith('econolearn-cache-') && k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(()=>self.clients.claim())
  );
});

// network-first for html/js; cache-first for assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.endsWith('.html') || url.pathname.endsWith('.jsx')) {
    event.respondWith(
      fetch(event.request).then((resp)=> {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(cache=>cache.put(event.request, copy));
        return resp;
      }).catch(()=> caches.match(event.request))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((resp)=> resp || fetch(event.request))
    );
  }
});