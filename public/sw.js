/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'saweg-pwa-v1';

const PRECACHE_URLS = [
  '/offline.html',
  '/manifest.json',
  '/images/logo.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => (key === CACHE_NAME ? Promise.resolve() : caches.delete(key))));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Navigation requests: network first, fallback to offline page.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          return fresh;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match('/offline.html');
          return cached || new Response('Offline', { status: 503, headers: { 'content-type': 'text/plain' } });
        }
      })()
    );
    return;
  }

  // Static assets: cache-first.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) return cached;

      try {
        const res = await fetch(req);
        if (res && res.ok && req.method === 'GET' && new URL(req.url).origin === self.location.origin) {
          cache.put(req, res.clone());
        }
        return res;
      } catch {
        return cached || new Response('Offline', { status: 503, headers: { 'content-type': 'text/plain' } });
      }
    })()
  );
});
