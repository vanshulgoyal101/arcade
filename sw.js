// Tiny service worker for the arcade. GitHub Pages serves HTML with
// Cache-Control: max-age=600, so a refresh could show a 10-minute-stale page.
// Strategy: network-first for documents (always fresh when online, bypassing
// the HTTP cache), cache-first for content-hashed assets (immutable).

const CACHE = 'arcade-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isDocument =
    req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');

  if (isDocument) {
    event.respondWith(
      (async () => {
        try {
          // `no-store` skips the browser HTTP cache so we truly hit the network.
          const fresh = await fetch(req, { cache: 'no-store' });
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          return (await caches.match(req)) || Response.error();
        }
      })()
    );
    return;
  }

  // Hashed assets never change under the same name — serve from cache first.
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        if (fresh.ok && fresh.type === 'basic') {
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch {
        return Response.error();
      }
    })()
  );
});
