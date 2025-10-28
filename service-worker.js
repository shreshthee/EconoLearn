// EconoLearn – SW v12 (stale-while-revalidate for speed)
const VERSION = 'v12';
const STATIC = `econolearn-static-${VERSION}`;
const RUNTIME = `econolearn-runtime-${VERSION}`;

const STATIC_ASSETS = [
  './','./index.html','./favicon-16.png','./favicon-32.png',
  './apple-touch-icon.png','./ganesh.png','./manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC).then(c => c.addAll(STATIC_ASSETS)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys
      .filter(k => ![STATIC,RUNTIME].includes(k)).map(k => caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const {request} = event;
  const url = new URL(request.url);

  // Navigations: network-first (so new deploys show quickly)
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(()=>caches.match('./index.html')));
    return;
  }

  // Fast SWR for app code + data
  const isSWR = url.pathname.endsWith('/main.jsx') || url.pathname.endsWith('/questions.json');
  if (isSWR) {
    event.respondWith((async ()=>{
      const cache = await caches.open(RUNTIME);
      const cached = await cache.match(request);
      const fetchPromise = fetch(new Request(request, {cache:'no-cache'}))
        .then(resp => { cache.put(request, resp.clone()); return resp; })
        .catch(()=>null);
      return cached || fetchPromise || fetch(request);
    })());
    return;
  }

  // Everything else: cache-first fallback
  event.respondWith(
    caches.match(request).then(hit => hit || fetch(request))
  );
});
