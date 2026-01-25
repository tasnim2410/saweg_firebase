'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

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
      return;
    }

    let dispose: null | (() => void) = null;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        const warmup = async () => {
          const lang = document.documentElement.lang === 'en' ? 'en' : 'ar';
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

        // Warm caches on app start so offline pages work even if user didn't open them explicitly.
        void warmup();

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
          void warmup();
        };

        // Proactively check for updates.
        const onUpdateCheck = () => {
          void reg.update().catch(() => null);
          void warmup();
        };

        window.addEventListener('focus', onUpdateCheck);
        window.addEventListener('online', onUpdateCheck);
        window.addEventListener('saweg:warmup', onWarmup as EventListener);
        const intervalId = window.setInterval(onUpdateCheck, 60 * 60 * 1000);

        return () => {
          window.removeEventListener('focus', onUpdateCheck);
          window.removeEventListener('online', onUpdateCheck);
          window.removeEventListener('saweg:warmup', onWarmup as EventListener);
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
      dispose?.();
    };
  }, []);

  return null;
}
