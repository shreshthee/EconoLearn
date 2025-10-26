/* === EconoLearn Service Worker — v13 === */

const VERSION = 'v13';
const CACHE_STATIC = `econolearn-static-${VERSION}`;
const CACHE_RUNTIME = `econolearn-runtime-${VERSION}`;
const APP_SHELL = [
  './',                    // index.html (served by server as root)
  './index.html?v=13',
  './main.jsx?v=13',
  './manifest.webmanifest?v=13',
  './favicon-16.png',
  './favicon-32.png',
  './apple-touch-icon.png',
  './ganesh.png',
  // CDNs are cached at runtime with SWR, no need to pre-cache them
];

// Helpers
const isGET = (req) => req.method === 'GET';
const url = (req) => new URL(req.url);

// Install: pre-cache app shell for offline
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_STATIC);
      await cache.addAll(APP_SHELL);
      // Take control ASAP after install
      self.skipWaiting();
    })()
  );
});

// Activate: clean old caches and take control of clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => ![CACHE_STATIC, CACHE_RUNTIME].includes(k))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Strategy helpers
async function cacheFirst(req, cacheName = CACHE_STATIC) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;

  const res = await fetch(req);
  if (res && res.ok) {
    cache.put(req, res.clone());
  }
  return res;
}

async function networkFirst(req, cacheName = CACHE_RUNTIME, timeoutMs = 6000) {
  const cache = await caches.open(cacheName);

  // Race network with a timeout; fallback to cache if needed
  const fetchPromise = (async () => {
    const netRes = await fetch(req);
    if (netRes && netRes.ok) {
      cache.put(req, netRes.clone());
    }
    return netRes;
  })();

  const timeoutPromise = new Promise((resolve) =>
    setTimeout(async () => {
      const cached = await cache.match(req);
      if (cached) resolve(cached);
    }, timeoutMs)
  );

  try {
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (_) {
    const cached = await cache.match(req);
    if (cached) return cached;
    throw _;
  }
}

async function staleWhileRevalidate(req, cacheName = CACHE_RUNTIME) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);

  const networkUpdate = (async () => {
    try {
      const res = await fetch(req);
      if (res && res.ok) cache.put(req, res.clone());
    } catch (_) {
      // ignore network errors; we still have cached response if any
    }
  })();

  return cached || (await fetch(req).then(async (res) => {
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  })).catch(() => cached);
}

// Fetch: route by resource type
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!isGET(request)) return;

  const u = url(request);
  const pathname = u.pathname || '';

  // 1) Always try FRESH for questions.json (then fall back to cache)
  if (pathname.endsWith('/questions.json')) {
    event.respondWith(networkFirst(request, CACHE_RUNTIME, 7000));
    return;
  }

  // 2) HTML navigation requests → networkFirst for fresh, fallback offline shell
  const isHTML =
    request.headers.get('accept')?.includes('text/html') &&
    (request.mode === 'navigate' || pathname.endsWith('.html') || pathname === '/' || pathname === '');
  if (isHTML) {
    event.respondWith(
      (async () => {
        try {
          // Try network (ensures newest main.jsx/questions linkage)
          const res = await fetch(request);
          // Optionally put in static cache for offline shell
          const cache = await caches.open(CACHE_STATIC);
          cache.put(request, res.clone());
          return res;
        } catch (_) {
          // Offline fallback to cached shell
          const cache = await caches.open(CACHE_STATIC);
          return (await cache.match('./index.html?v=13')) || (await cache.match('./'));
        }
      })()
    );
    return;
  }

  // 3) Static app shell files (JS/manifest/icons) → cacheFirst
  if (
    pathname.endsWith('/main.jsx') ||
    pathname.endsWith('.webmanifest') ||
    pathname.endsWith('favicon-16.png') ||
    pathname.endsWith('favicon-32.png') ||
    pathname.endsWith('apple-touch-icon.png') ||
    pathname.endsWith('ganesh.png')
  ) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  // 4) CDN libraries (Chart.js, Confetti, React, Tailwind) → staleWhileRevalidate
  const isCDN = /(cdn\.tailwindcss\.com|cdn\.jsdelivr\.net|unpkg\.com)/i.test(u.hostname);
  if (isCDN) {
    event.respondWith(staleWhileRevalidate(request, CACHE_RUNTIME));
    return;
  }

  // 5) Images/fonts/other → cacheFirst (good offline)
  const isAsset = /\.(png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|otf)$/i.test(pathname);
  if (isAsset) {
    event.respondWith(cacheFirst(request, CACHE_RUNTIME));
    return;
  }

  // 6) Default: try network, fall back to cache
  event.respondWith(
    (async () => {
      try {
        const res = await fetch(request);
        // Cache successful GETs
        if (res && res.ok && request.method === 'GET') {
          const cache = await caches.open(CACHE_RUNTIME);
          cache.put(request, res.clone());
        }
        return res;
      } catch (_) {
        const cache = await caches.open(CACHE_RUNTIME);
        const cached = await cache.match(request);
        if (cached) return cached;
        // Last resort: return a generic Response to avoid breaking
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })()
  );
});