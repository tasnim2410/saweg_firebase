/* eslint-disable no-restricted-globals */

try {
  importScripts('/idb.js');
} catch {
  // ignore
}

const CACHE_NAME = 'saweg-pwa-v4';

const PRECACHE_URLS = [
  '/offline.html',
  '/manifest.json',
  '/images/logo.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/idb.js',
];

const DYNAMIC_API_PATHS = ['/api/providers', '/api/merchant-goods-posts'];

const makeApiKey = (url) => `api:${url.pathname}${url.search}`;

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

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let data = {};
      try {
        data = event.data ? event.data.json() : {};
      } catch {
        data = { title: 'Saweg', body: event.data ? String(event.data.text()) : '' };
      }

      const title = data.title || 'Saweg';
      const body = data.body || '';
      const url = data.url || '/ar';

      await self.registration.showNotification(title, {
        body,
        icon: '/icons/icon-192x192.png?v=2',
        badge: '/icons/icon-192x192.png?v=2',
        data: { url },
      });
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/ar';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  const url = new URL(req.url);

  // Never cache Next.js internal assets. Caching these can cause stale JS/CSS and hydration mismatches.
  if (
    url.origin === self.location.origin &&
    url.pathname.startsWith('/_next/') &&
    !url.pathname.startsWith('/_next/static/')
  ) {
    event.respondWith(fetch(req));
    return;
  }

  // Dynamic data: network-first; persist last successful payload in IndexedDB; serve it when offline.
  if (
    url.origin === self.location.origin &&
    req.method === 'GET' &&
    DYNAMIC_API_PATHS.includes(url.pathname)
  ) {
    const key = makeApiKey(url);
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res && res.ok) {
            const clone = res.clone();
            event.waitUntil(
              (async () => {
                try {
                  const data = await clone.json();
                  await self.sawegIdb?.setJson(key, data);
                } catch {
                  // ignore
                }
              })()
            );
          }
          return res;
        } catch {
          try {
            const entry = await self.sawegIdb?.getJson(key);
            if (entry && entry.data) {
              return new Response(JSON.stringify(entry.data), {
                status: 200,
                headers: {
                  'content-type': 'application/json; charset=utf-8',
                  'x-offline-cache': '1',
                  'x-offline-updated-at': String(entry.updatedAt || ''),
                },
              });
            }
          } catch {
            // ignore
          }
          return new Response(JSON.stringify({ error: 'OFFLINE_NO_CACHE' }), {
            status: 503,
            headers: { 'content-type': 'application/json; charset=utf-8' },
          });
        }
      })()
    );
    return;
  }

  // Never cache API responses. This avoids issues like stale auth/session state.
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(req));
    return;
  }

  // Navigation requests: network first, fallback to offline page.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          try {
            if (fresh && fresh.ok) {
              const cache = await caches.open(CACHE_NAME);
              await cache.put(req, fresh.clone());
            }
          } catch {
            // ignore
          }
          return fresh;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const cachedNav = await cache.match(req);
          if (cachedNav) return cachedNav;
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
