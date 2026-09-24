// Tiny service worker for the arcade. GitHub Pages serves HTML with
// Cache-Control: max-age=600, so a refresh could show a 10-minute-stale page.
// Strategy: network-first for documents (always fresh when online, bypassing
// the HTTP cache), cache-first for content-hashed bundles (immutable), and
// stale-while-revalidate for everything else.

const CACHE = 'arcade-v3';
const IMMUTABLE = /-[A-Za-z0-9_-]{8,}\.(?:js|css)$/;
const AUTH_PARAMS = new Set(['code', 'access_token', 'refresh_token', 'token', 'token_hash', 'id_token', 'error', 'error_description']);

async function cachedResponse(request) {
  try { return await caches.match(request); } catch { return null; }
}

async function storeResponse(request, response) {
  if (!response.ok || response.type === 'opaque') return;
  if (/(?:^|,)\s*(?:no-store|private)(?:\s|=|,|$)/i.test(response.headers.get('cache-control') || '')) return;
  try {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  } catch {}
}

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('arcade-') && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.cache === 'no-store' || req.headers.has('authorization') ||
      [...url.searchParams.keys()].some(key => AUTH_PARAMS.has(key.toLowerCase()))) return;

  const isDocument =
    req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');

  if (isDocument) {
    event.respondWith(
      (async () => {
        try {
          // `no-store` skips the browser HTTP cache so we truly hit the network.
          const fresh = await fetch(req, { cache: 'no-store' });
          if (fresh.status >= 500) return (await cachedResponse(req)) || fresh;
          await storeResponse(req, fresh);
          return fresh;
        } catch {
          return (await cachedResponse(req)) || Response.error();
        }
      })()
    );
    return;
  }

  // Only content-hashed bundles (…-C7Ab12Xy.js) are safe to serve cache-first:
  // their name changes with their contents. The hub's ?v= assets keep the same
  // path, so caching those forever pins visitors to whatever shipped first.
  if (IMMUTABLE.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cached = await cachedResponse(req);
        if (cached) return cached;
        try {
          const fresh = await fetch(req);
          await storeResponse(req, fresh);
          return fresh;
        } catch {
          return Response.error();
        }
      })()
    );
    return;
  }

  // Everything else: serve the cached copy at once, but refresh it in the
  // background so an edit lands on the next load instead of never.
  const network = fetch(req)
    .then(async (fresh) => {
      await storeResponse(req, fresh);
      return fresh;
    })
    .catch(() => null);
  event.waitUntil(network.then(() => undefined));
  event.respondWith(
    (async () => {
      const cached = await cachedResponse(req);
      return cached || (await network) || Response.error();
    })()
  );
});
