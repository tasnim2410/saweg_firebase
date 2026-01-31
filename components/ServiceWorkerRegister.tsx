'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const showSyncSuccess = () => {
      try {
        const id = 'saweg-sync-success-toast';
        const existing = document.getElementById(id);
        if (existing) existing.remove();

        const el = document.createElement('div');
        el.id = id;
        el.textContent = '✓ Données synchronisées';
        el.setAttribute('role', 'status');
        el.style.position = 'fixed';
        el.style.left = '50%';
        el.style.bottom = '16px';
        el.style.transform = 'translateX(-50%)';
        el.style.zIndex = '9999';
        el.style.background = 'rgba(16, 185, 129, 0.95)';
        el.style.color = '#ffffff';
        el.style.padding = '10px 14px';
        el.style.borderRadius = '9999px';
        el.style.fontSize = '14px';
        el.style.fontFamily = 'var(--font-sans)';
        el.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.2), 0 4px 6px -4px rgba(0,0,0,0.2)';
        document.body.appendChild(el);

        window.setTimeout(() => {
          try {
            el.remove();
          } catch {
          }
        }, 4000);
      } catch {
      }
    };

    const requestQueueProcess = () => {
      try {
        navigator.serviceWorker?.controller?.postMessage({ type: 'PROCESS_QUEUE' });
      } catch {
      }
      try {
        void navigator.serviceWorker?.ready
          ?.then((reg) => reg.active?.postMessage({ type: 'PROCESS_QUEUE' }))
          .catch(() => null);
      } catch {
      }
    };

    const onMessage = (event: MessageEvent) => {
      const type = (event as any)?.data?.type;
      if (type === 'SYNC_SUCCESS') {
        showSyncSuccess();
      }
    };

    navigator.serviceWorker.addEventListener('message', onMessage);

    if (process.env.NODE_ENV !== 'production') {
      const key = 'dev_sw_cleared_v1';
      try {
        if (sessionStorage.getItem(key) === '1') return;
        sessionStorage.setItem(key, '1');
      } catch {
        // ignore
      }

      const cleanup = async () => {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
        } catch {
          // ignore
        }

        try {
          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          }
        } catch {
          // ignore
        }

        try {
          if (navigator.serviceWorker.controller) {
            window.location.reload();
          }
        } catch {
          // ignore
        }
      };

      void cleanup();

      try {
        navigator.serviceWorker.removeEventListener('message', onMessage);
      } catch {
      }
      return;
    }

    let dispose: null | (() => void) = null;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        const isSlowConnection = () => {
          try {
            const anyNav = navigator as any;
            const conn = anyNav.connection || anyNav.mozConnection || anyNav.webkitConnection;
            if (!conn) return false;
            if (conn.saveData) return true;
            const t = String(conn.effectiveType || '').toLowerCase();
            return t === 'slow-2g' || t === '2g' || t === '3g';
          } catch {
            return false;
          }
        };

        const scheduleIdle = (fn: () => void) => {
          if (typeof window === 'undefined') return;
          try {
            const ric = (window as any).requestIdleCallback as undefined | ((cb: () => void, opts?: any) => number);
            if (typeof ric === 'function') {
              ric(fn, { timeout: 5000 });
            } else {
              window.setTimeout(fn, 3000);
            }
          } catch {
            window.setTimeout(fn, 3000);
          }
        };

        const warmup = async () => {
          const lang = document.documentElement.lang === 'en' ? 'en' : 'ar';

          try {
            const ctrl = navigator.serviceWorker.controller;
            ctrl?.postMessage({ type: 'WARMUP', lang });
          } catch {
            // ignore
          }

          const pages = [
            `/${lang}`,
            `/${lang}/my-profile`,
            `/${lang}/dashboard/my-posts`,
            `/${lang}/dashboard/my-providers`,
          ];

          const apis = [
            '/api/providers',
            '/api/merchant-goods-posts',
            '/api/auth/me',
            '/api/providers/mine',
          ];

          const baseOpts: RequestInit = {
            credentials: 'include',
            cache: 'reload',
          };

          const assetUrls = new Set<string>();

          const fetchPageAndAssets = async (path: string) => {
            try {
              const res = await fetch(path, baseOpts);
              if (!res.ok) return;
              const html = await res.text();

              // Extract Next.js static assets so the page can render offline even if user never visited it.
              const re = /\"(\/_next\/static\/[^\"\\]+)\"|\'(\/_next\/static\/[^\'\\]+)\'/g;
              let m: RegExpExecArray | null;
              while ((m = re.exec(html))) {
                const u = m[1] || m[2];
                if (u) assetUrls.add(u);
              }
            } catch {
              // ignore
            }
          };

          await Promise.allSettled(pages.map((p) => fetchPageAndAssets(p)));
          await Promise.allSettled(apis.map((u) => fetch(u, baseOpts).catch(() => null)));
          await Promise.allSettled(Array.from(assetUrls).map((u) => fetch(u, baseOpts).catch(() => null)));
        };

        const reloadOnceOnControllerChange = () => {
          let reloaded = false;
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (reloaded) return;
            reloaded = true;
            window.location.reload();
          });
        };

        const tryActivateWaitingWorker = async () => {
          const waiting = reg.waiting;
          if (!waiting) return;
          waiting.postMessage({ type: 'SKIP_WAITING' });
        };

        reloadOnceOnControllerChange();

        // If there's already a waiting SW (e.g. after returning to the app), activate it.
        await tryActivateWaitingWorker();

        // Warm caches only when user is idle and connection is not slow.
        const scheduleWarmup = () => {
          if (isSlowConnection()) return;
          scheduleIdle(() => {
            void warmup();
          });
        };

        scheduleWarmup();

        // When a new worker is found, and it reaches "installed", trigger activation.
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              void tryActivateWaitingWorker();
            }
          });
        });

        const onWarmup = () => {
          scheduleWarmup();
        };

        // Proactively check for updates.
        const onUpdateCheck = () => {
          void reg.update().catch(() => null);
          scheduleWarmup();
        };

        window.addEventListener('focus', onUpdateCheck);
        window.addEventListener('online', onUpdateCheck);
        window.addEventListener('saweg:warmup', onWarmup as EventListener);
        const intervalId = window.setInterval(onUpdateCheck, 60 * 60 * 1000);

        const onOnline = () => {
          requestQueueProcess();
        };

        const onFocus = () => {
          requestQueueProcess();
        };

        window.addEventListener('online', onOnline);
        window.addEventListener('focus', onFocus);

        requestQueueProcess();

        return () => {
          window.removeEventListener('focus', onUpdateCheck);
          window.removeEventListener('online', onUpdateCheck);
          window.removeEventListener('saweg:warmup', onWarmup as EventListener);
          window.removeEventListener('online', onOnline);
          window.removeEventListener('focus', onFocus);
          window.clearInterval(intervalId);
        };
      } catch (err) {
        // ignore
      }
    };

    void register().then((d) => {
      dispose = typeof d === 'function' ? d : null;
    });

    return () => {
      try {
        navigator.serviceWorker.removeEventListener('message', onMessage);
      } catch {
      }
      dispose?.();
    };
  }, []);

  return null;
}
