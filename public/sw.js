/* eslint-disable no-restricted-globals */

try {
  importScripts('/idb.js');
} catch {
  // ignore
}

const CACHE_NAME = 'saweg-pwa-v7';

const SYNC_TAG = 'saweg-sync-v1';
const PERIODIC_SYNC_TAG = 'saweg-periodic-sync-v1';
const DEFAULT_MAX_QUEUE_BYTES = 50 * 1024 * 1024;
const ABSOLUTE_MAX_QUEUE_BYTES = 150 * 1024 * 1024;

const getMaxQueueBytes = async () => {
  try {
    const nav = self.navigator;
    const storage = nav && nav.storage;
    if (!storage || typeof storage.estimate !== 'function') return DEFAULT_MAX_QUEUE_BYTES;
    const est = await storage.estimate();
    const quota = typeof est?.quota === 'number' ? est.quota : 0;
    if (!quota) return DEFAULT_MAX_QUEUE_BYTES;
    const tenPct = Math.floor(quota * 0.1);
    const max = Math.max(DEFAULT_MAX_QUEUE_BYTES, tenPct);
    return Math.min(ABSOLUTE_MAX_QUEUE_BYTES, max);
  } catch {
    return DEFAULT_MAX_QUEUE_BYTES;
  }
};

const PRECACHE_URLS = [
  '/offline.html',
  '/manifest.json',
  '/images/logo.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/idb.js',
];

const DYNAMIC_API_PATHS = [
  '/api/providers',
  '/api/merchant-goods-posts',
  '/api/auth/me',
  '/api/providers/mine',
];

const makeApiKey = (url) => `api:${url.pathname}${url.search}`;

const isQueueableApiRequest = (url, req) => {
  if (url.origin !== self.location.origin) return false;
  if (!url.pathname.startsWith('/api/')) return false;
  if (url.pathname.startsWith('/api/auth')) return false;
  const m = String(req.method || '').toUpperCase();
  if (m !== 'POST' && m !== 'PUT' && m !== 'PATCH') return false;
  return true;
};

const safeJsonResponse = (obj, status) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  });

const collectQueueSize = async () => {
  try {
    const items = (await self.sawegIdb?.queueGetAll?.()) || [];
    let total = 0;
    for (const it of items) {
      const n = typeof it?.sizeBytes === 'number' ? it.sizeBytes : 0;
      total += n;
    }
    return total;
  } catch {
    return 0;
  }
};

const tryRegisterSync = async () => {
  try {
    if (self.registration && self.registration.sync && typeof self.registration.sync.register === 'function') {
      await self.registration.sync.register(SYNC_TAG);
    }
  } catch {
  }
};

const broadcastMessage = async (data) => {
  try {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(allClients.map((c) => c.postMessage(data)));
  } catch {
  }
};

const serializeFormData = (fd) => {
  const parts = [];
  let sizeBytes = 0;
  try {
    for (const pair of fd.entries()) {
      const name = pair[0];
      const value = pair[1];
      if (typeof value === 'string') {
        sizeBytes += value.length;
        parts.push({ name, kind: 'text', value });
      } else {
        const f = value;
        const fSize = typeof f?.size === 'number' ? f.size : 0;
        sizeBytes += fSize;
        parts.push({ name, kind: 'file', file: f, filename: f?.name || 'file', contentType: f?.type || '' });
      }
    }
  } catch {
  }
  return { parts, sizeBytes };
};

const serializeRequestForQueue = async (req) => {
  const url = new URL(req.url);
  const method = String(req.method || 'GET').toUpperCase();
  const headers = {};
  try {
    req.headers.forEach((v, k) => {
      const key = String(k || '').toLowerCase();
      if (key === 'content-length') return;
      if (key === 'host') return;
      if (key === 'connection') return;
      if (key === 'accept-encoding') return;
      headers[key] = v;
    });
  } catch {
  }

  let bodyType = null;
  let body = null;
  let sizeBytes = 0;

  const contentType = String(req.headers.get('content-type') || '');

  if (method !== 'GET' && method !== 'HEAD') {
    if (contentType.includes('multipart/form-data')) {
      try {
        const fd = await req.clone().formData();
        const serialized = serializeFormData(fd);
        bodyType = 'formData';
        body = serialized.parts;
        sizeBytes += serialized.sizeBytes;
        try {
          delete headers['content-type'];
        } catch {
        }
      } catch {
      }
    } else {
      try {
        const txt = await req.clone().text();
        bodyType = 'text';
        body = txt;
        sizeBytes += txt.length;
      } catch {
      }
    }
  }

  let idempotencyKey = null;
  if (method === 'POST') {
    try {
      idempotencyKey =
        self.crypto && typeof self.crypto.randomUUID === 'function'
          ? self.crypto.randomUUID()
          : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    } catch {
      idempotencyKey = `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  }

  return {
    url: url.pathname + url.search,
    method,
    headers,
    bodyType,
    body,
    idempotencyKey,
    createdAt: Date.now(),
    sizeBytes,
  };
};

const enqueueFailedApiRequest = async (req) => {
  const item = await serializeRequestForQueue(req);
  const currentBytes = await collectQueueSize();
  const maxBytes = await getMaxQueueBytes();
  if (currentBytes + (item.sizeBytes || 0) > maxBytes) {
    return {
      ok: false,
      error: 'OFFLINE_QUEUE_FULL',
      currentBytes,
      itemBytes: item.sizeBytes || 0,
      maxBytes,
    };
  }
  try {
    await self.sawegIdb?.queueAdd?.(item);
  } catch {
    return { ok: false, error: 'OFFLINE_QUEUE_FAILED' };
  }
  await tryRegisterSync();
  return { ok: true };
};

const replayQueuedRequest = async (item) => {
  const headers = new Headers();
  try {
    for (const k of Object.keys(item.headers || {})) {
      headers.set(k, String(item.headers[k]));
    }
  } catch {
  }

  if (item && item.method === 'POST') {
    const stableKey =
      item.idempotencyKey ||
      `legacy-${String(item.id || '')}:${String(item.createdAt || '')}:${String(item.url || '')}`;
    try {
      headers.set('x-idempotency-key', String(stableKey));
    } catch {
    }
  }

  let body = undefined;
  if (item.bodyType === 'formData') {
    const fd = new FormData();
    const parts = Array.isArray(item.body) ? item.body : [];
    for (const p of parts) {
      if (!p || typeof p.name !== 'string') continue;
      if (p.kind === 'text') {
        fd.append(p.name, typeof p.value === 'string' ? p.value : '');
      } else if (p.kind === 'file') {
        if (p.file) {
          try {
            fd.append(p.name, p.file, p.filename || 'file');
          } catch {
            fd.append(p.name, p.file);
          }
        }
      }
    }
    body = fd;
    try {
      headers.delete('content-type');
    } catch {
    }
  } else if (item.bodyType === 'text') {
    body = typeof item.body === 'string' ? item.body : '';
  }

  const reqInit = {
    method: item.method,
    headers,
    body,
    credentials: 'include',
  };

  return fetch(item.url, reqInit);
};

let queueProcessingPromise = null;

const processQueueOnce = async () => {
  if (queueProcessingPromise) return queueProcessingPromise;
  queueProcessingPromise = (async () => {
    try {
      await processQueue();
    } finally {
      queueProcessingPromise = null;
    }
  })();
  return queueProcessingPromise;
};

const processQueue = async () => {
  const items = (await self.sawegIdb?.queueGetAll?.()) || [];
  const sorted = items.slice().sort((a, b) => (a.id || 0) - (b.id || 0));
  let removed = 0;

  let didCreate = false;
  let didUpdate = false;

  for (const item of sorted) {
    if (!item || typeof item.id !== 'number') continue;
    try {
      const res = await replayQueuedRequest(item);
      if (res && res.ok) {
        const m = String(item.method || '').toUpperCase();
        if (m === 'POST') didCreate = true;
        if (m === 'PATCH' || m === 'PUT') didUpdate = true;
        await self.sawegIdb?.queueDelete?.(item.id);
        removed += 1;
        continue;
      }

      let parsed = null;
      let rawText = '';
      try {
        rawText = await res.clone().text();
      } catch {
        rawText = '';
      }
      if (rawText) {
        try {
          parsed = JSON.parse(rawText);
        } catch {
          parsed = null;
        }
      }

      try {
        await broadcastMessage({
          type: 'SYNC_FAILED',
          status: res?.status,
          error: parsed && typeof parsed === 'object' ? parsed.error : undefined,
          message: parsed && typeof parsed === 'object' ? parsed.message : rawText ? rawText.slice(0, 200) : undefined,
          url: item?.url,
          method: item?.method,
        });
      } catch {
      }
      break;
    } catch (err) {
      try {
        await broadcastMessage({
          type: 'SYNC_FAILED',
          message: err instanceof Error ? err.message : String(err),
          url: item?.url,
          method: item?.method,
        });
      } catch {
      }
      break;
    }
  }

  const remaining = (await self.sawegIdb?.queueGetAll?.()) || [];

  let allClients = [];
  try {
    allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  } catch {
    allClients = [];
  }

  let anyVisible = false;
  try {
    anyVisible = allClients.some((c) => c && c.visibilityState === 'visible');
  } catch {
    anyVisible = false;
  }

  if (removed > 0 && remaining.length === 0) {
    const kind = didCreate && didUpdate ? 'mixed' : didCreate ? 'created' : didUpdate ? 'updated' : 'synced';

    try {
      const cache = await caches.open(CACHE_NAME);
      const keys = await cache.keys();
      await Promise.all(
        keys.map(async (req) => {
          try {
            const u = new URL(req.url);
            if (u.origin !== self.location.origin) return;
            if (u.pathname.endsWith('/providers') || u.pathname.endsWith('/merchant-goods-posts')) {
              await cache.delete(req);
            }
          } catch {
            // ignore
          }
        })
      );
    } catch {
      // ignore
    }

    if (anyVisible) {
      await broadcastMessage({ type: 'SYNC_SUCCESS', kind });
      return;
    }

    try {
      const body =
        kind === 'created'
          ? 'Post added'
          : kind === 'updated'
            ? 'Post updated'
            : kind === 'mixed'
              ? 'Posts synchronized'
              : 'Data synchronized';

      await self.registration.showNotification('Saweg', {
        body,
        icon: '/icons/icon-192x192.png?v=2',
        badge: '/images/logo.png',
        data: { url: '/ar' },
        tag: 'saweg-sync-success',
      });
    } catch {
    }
    return;
  }

  if (!anyVisible && remaining.length > 0) {
    try {
      if (removed === 0) {
        const throttleKey = 'saweg:lastPendingSyncNotify';
        let lastAt = 0;
        try {
          const entry = await self.sawegIdb?.getJson?.(throttleKey);
          const at = entry && entry.data && typeof entry.data.at === 'number' ? entry.data.at : 0;
          lastAt = Number.isFinite(at) ? at : 0;
        } catch {
          lastAt = 0;
        }

        const now = Date.now();
        if (!lastAt || now - lastAt > 30 * 60 * 1000) {
          try {
            await self.sawegIdb?.setJson?.(throttleKey, { at: now, count: remaining.length });
          } catch {
          }

          await self.registration.showNotification('Saweg', {
            body: 'Pending post could not be synced. Open the app to finish.',
            icon: '/icons/icon-192x192.png?v=2',
            badge: '/images/logo.png',
            data: { url: '/ar' },
            tag: 'saweg-sync-pending',
          });
        }
      }
    } catch {
    }
  }
};

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

self.addEventListener('message', (event) => {
  if (event?.data?.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
    return;
  }

  if (event?.data?.type === 'PROCESS_QUEUE') {
    event.waitUntil(processQueueOnce());
    return;
  }

  if (event?.data?.type === 'WARMUP') {
    const lang = event?.data?.lang === 'en' ? 'en' : 'ar';

    const pages = [
      `/${lang}`,
      `/${lang}/my-profile`,
      `/${lang}/dashboard/my-posts`,
      `/${lang}/dashboard/my-providers`,
      `/${lang}/dashboard/add-provider`,
      `/${lang}/dashboard/add-merchant-post`,
      `/${lang}/dashboard/add-merchant-goods-post`,
    ];

    const apis = [
      '/api/providers',
      '/api/merchant-goods-posts',
      '/api/auth/me',
      '/api/providers/mine',
    ];

    const baseInit = {
      credentials: 'include',
      cache: 'reload',
    };

    const warmup = async () => {
      const cache = await caches.open(CACHE_NAME);
      const assetUrls = new Set();

      const fetchAndCachePage = async (path) => {
        try {
          const res = await fetch(path, baseInit);
          if (!res || !res.ok) return;

          const clone = res.clone();
          try {
            await cache.put(path, clone);
          } catch {
            // ignore
          }

          try {
            const html = await res.text();
            const re = /\"(\/_next\/static\/[^\"\\]+)\"|\'(\/_next\/static\/[^\'\\]+)\'/g;
            let m;
            while ((m = re.exec(html))) {
              const u = m[1] || m[2];
              if (u) assetUrls.add(u);
            }
          } catch {
            // ignore
          }
        } catch {
          // ignore
        }
      };

      const fetchAndCacheAsset = async (u) => {
        try {
          // Only cache Next.js hashed static assets. These are safe because their filenames are content-hashed.
          // Avoid caching other /_next/* endpoints.
          const url = String(u || '');
          if (url.startsWith('/_next/') && !url.startsWith('/_next/static/')) return;
          const cached = await cache.match(u);
          if (cached) return;
          const res = await fetch(u, baseInit);
          if (res && res.ok) {
            await cache.put(u, res.clone());
          }
        } catch {
          // ignore
        }
      };

      const refreshApiJson = async (path) => {
        try {
          const res = await fetch(path, baseInit);
          if (!res || !res.ok) return;
          const data = await res.json();
          const key = makeApiKey(new URL(path, self.location.origin));
          await self.sawegIdb?.setJson(key, data);
        } catch {
          // ignore
        }
      };

      await Promise.allSettled(pages.map((p) => fetchAndCachePage(p)));
      await Promise.allSettled(Array.from(assetUrls).map((u) => fetchAndCacheAsset(u)));
      await Promise.allSettled(apis.map((u) => refreshApiJson(u)));
    };

    event.waitUntil(warmup());
  }
});

self.addEventListener('sync', (event) => {
  if (event?.tag !== SYNC_TAG) return;
  event.waitUntil(processQueueOnce());
});

self.addEventListener('periodicsync', (event) => {
  if (event?.tag !== PERIODIC_SYNC_TAG) return;
  event.waitUntil(processQueueOnce());
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
        badge: '/icons/logo_icon.svg',
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

  if (isQueueableApiRequest(url, req)) {
    const reqForQueue = req.clone();
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          return res;
        } catch {
          const enq = await enqueueFailedApiRequest(reqForQueue);
          if (!enq.ok) {
            return safeJsonResponse(
              {
                error: enq.error || 'OFFLINE_QUEUE_FAILED',
                currentBytes: enq.currentBytes,
                itemBytes: enq.itemBytes,
                maxBytes: enq.maxBytes,
              },
              507
            );
          }
          return safeJsonResponse({ queued: true }, 202);
        }
      })()
    );
    return;
  }

  // Cache Next.js static assets (JS/CSS) so offline/poor network doesn't render unstyled HTML.
  // These are content-hashed, so serving them from cache is safe.
  if (url.origin === self.location.origin && req.method === 'GET' && url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res && res.ok) {
          try {
            await cache.put(req, res.clone());
          } catch {
            // ignore
          }
        }
        return res;
      })()
    );
    return;
  }

  // Never cache Next.js internal assets (including /_next/static). Caching these can cause stale JS/CSS and hydration mismatches.
  if (url.origin === self.location.origin && url.pathname.startsWith('/_next/')) {
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

              // Also cache Next.js static assets referenced by this HTML so the page can render offline
              // without missing CSS/JS.
              event.waitUntil(
                (async () => {
                  try {
                    const html = await fresh.clone().text();
                    const re = /\"(\/_next\/static\/[^\"\\]+)\"|\'(\/_next\/static\/[^\'\\]+)\'/g;
                    const assetUrls = new Set();
                    let m;
                    while ((m = re.exec(html))) {
                      const u = m[1] || m[2];
                      if (u) assetUrls.add(u);
                    }

                    await Promise.allSettled(
                      Array.from(assetUrls).map(async (u) => {
                        try {
                          const assetReq = new Request(u, { credentials: 'same-origin' });
                          const already = await cache.match(assetReq);
                          if (already) return;
                          const res = await fetch(assetReq);
                          if (res && res.ok) {
                            await cache.put(assetReq, res.clone());
                          }
                        } catch {
                          // ignore
                        }
                      })
                    );
                  } catch {
                    // ignore
                  }
                })()
              );
            }
          } catch {
            // ignore
          }
          return fresh;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const cachedNav = await cache.match(req);
          if (cachedNav) return cachedNav;
          try {
            const byUrl = await cache.match(url.pathname + url.search);
            if (byUrl) return byUrl;
          } catch {
            // ignore
          }

          try {
            const byPath = await cache.match(url.pathname);
            if (byPath) return byPath;
          } catch {
            // ignore
          }
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
