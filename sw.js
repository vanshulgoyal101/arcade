// Tiny service worker for the arcade. GitHub Pages serves HTML with
// Cache-Control: max-age=600, so a refresh could show a 10-minute-stale page.
// Strategy: network-first for documents AND for shared, non-hashed static files
// (assets/style.css, assets/auth.js, art, og images) so a deploy is picked up
// on the next load; cache-first only for content-hashed, immutable bundles
// under /dist/assets/ (their name changes when the contents do).

const CACHE = 'arcade-v3';

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

async function networkFirst(req) {
  try {
    // `no-store` skips the browser HTTP cache so we truly hit the network.
    const fresh = await fetch(req, { cache: 'no-store' });
    if (fresh && fresh.ok && fresh.type === 'basic') {
      const cache = await caches.open(CACHE);
      cache.put(req, fresh.clone());
    }
    return fresh;
  } catch {
    return (await caches.match(req)) || Response.error();
  }
}

async function cacheFirst(req) {
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
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isDocument =
    req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');

  // Vite emits immutable, content-hashed bundles here — safe to cache forever.
  const isHashedBundle = url.pathname.includes('/dist/assets/');

  event.respondWith(isHashedBundle && !isDocument ? cacheFirst(req) : networkFirst(req));
});
