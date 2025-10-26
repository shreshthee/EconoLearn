// FILE: service-worker.js
// EconoLearn – Service Worker (v10)
const VERSION = 'v10';
// EconoLearn – Service Worker (v11)
const VERSION = 'v11';
const STATIC_CACHE = `econolearn-static-${VERSION}`;

// Only truly-static assets (no main.jsx, no questions.json)
@@ -43,14 +43,14 @@
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
