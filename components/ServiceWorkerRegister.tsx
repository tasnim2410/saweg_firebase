'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const isLighthouseRun = (() => {
      try {
        const ua = String(navigator.userAgent || '');
        if (/lighthouse/i.test(ua)) return true;
      } catch {
      }
      return false;
    })();

    let lastSyncFailedAt = 0;
    let lastSyncFailedKey = '';

    const showSyncSuccess = () => {
      try {
        const id = 'saweg-sync-success-toast';
        const existing = document.getElementById(id);
        if (existing) existing.remove();

        const lang = document.documentElement.lang === 'en' ? 'en' : 'ar';
        const text = lang === 'en' ? '✓ Synced successfully' : '✓ تمت المزامنة بنجاح';

        const el = document.createElement('div');
        el.id = id;
        el.textContent = text;
        el.setAttribute('role', 'status');
        el.style.position = 'fixed';
        el.style.left = '50%';
        el.style.top = '16px';
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

    const showBackgroundPermissionPrompt = async (opts?: { reg?: ServiceWorkerRegistration | null }) => {
      try {
        const id = 'saweg-bg-permission-prompt';
        const existing = document.getElementById(id);
        if (existing) return;

        const lastKey = 'saweg:bgPromptLastAt';
        const now = Date.now();
        try {
          const last = Number(localStorage.getItem(lastKey) || '0');
          if (Number.isFinite(last) && last > 0 && now - last < 7 * 24 * 60 * 60 * 1000) return;
        } catch {
        }

        const lang = document.documentElement.lang === 'en' ? 'en' : 'ar';

        let notifPermission: NotificationPermission | 'unsupported' = 'unsupported';
        try {
          if ('Notification' in window) notifPermission = Notification.permission;
        } catch {
          notifPermission = 'unsupported';
        }

        if (notifPermission !== 'default') return;

        try {
          localStorage.setItem(lastKey, String(now));
        } catch {
        }

        const title = lang === 'en' ? 'Enable background sync' : 'تفعيل المزامنة في الخلفية';
        const body =
          lang === 'en'
            ? 'Allow notifications to help sync your saved posts in the background.'
            : 'اسمح بالإشعارات للمساعدة في مزامنة المنشورات المحفوظة في الخلفية.';
        const btnText = lang === 'en' ? 'Enable' : 'تفعيل';
        const closeText = lang === 'en' ? 'Close' : 'إغلاق';

        const el = document.createElement('div');
        el.id = id;
        el.setAttribute('role', 'status');
        el.style.position = 'fixed';
        el.style.left = '50%';
        el.style.top = '16px';
        el.style.transform = 'translateX(-50%)';
        el.style.zIndex = '10000';
        el.style.maxWidth = 'calc(100vw - 24px)';
        el.style.background = 'rgba(17, 24, 39, 0.95)';
        el.style.color = '#ffffff';
        el.style.padding = '12px 14px';
        el.style.borderRadius = '14px';
        el.style.fontSize = '14px';
        el.style.fontFamily = 'var(--font-sans)';
        el.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.25), 0 4px 6px -4px rgba(0,0,0,0.25)';
        el.style.display = 'flex';
        el.style.gap = '10px';
        el.style.alignItems = 'center';

        const textWrap = document.createElement('div');
        textWrap.style.display = 'flex';
        textWrap.style.flexDirection = 'column';
        textWrap.style.gap = '2px';
        textWrap.style.minWidth = '0';

        const titleEl = document.createElement('div');
        titleEl.textContent = title;
        titleEl.style.fontWeight = '700';
        titleEl.style.whiteSpace = 'nowrap';
        titleEl.style.overflow = 'hidden';
        titleEl.style.textOverflow = 'ellipsis';

        const bodyEl = document.createElement('div');
        bodyEl.textContent = body;
        bodyEl.style.opacity = '0.9';
        bodyEl.style.whiteSpace = 'normal';

        textWrap.appendChild(titleEl);
        textWrap.appendChild(bodyEl);

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '8px';
        actions.style.alignItems = 'center';
        actions.style.flexShrink = '0';

        const enableBtn = document.createElement('button');
        enableBtn.type = 'button';
        enableBtn.textContent = btnText;
        enableBtn.style.border = '0';
        enableBtn.style.borderRadius = '9999px';
        enableBtn.style.padding = '8px 12px';
        enableBtn.style.background = 'rgba(16, 185, 129, 0.95)';
        enableBtn.style.color = '#ffffff';
        enableBtn.style.cursor = 'pointer';
        enableBtn.style.fontWeight = '700';

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = closeText;
        closeBtn.style.border = '1px solid rgba(255,255,255,0.25)';
        closeBtn.style.borderRadius = '9999px';
        closeBtn.style.padding = '8px 12px';
        closeBtn.style.background = 'transparent';
        closeBtn.style.color = '#ffffff';
        closeBtn.style.cursor = 'pointer';

        closeBtn.onclick = () => {
          try {
            el.remove();
          } catch {
          }
        };

        enableBtn.onclick = async () => {
          try {
            let permission: NotificationPermission = 'default';
            try {
              permission = await Notification.requestPermission();
            } catch {
              permission = 'default';
            }

            if (permission === 'granted') {
              try {
                const reg = opts?.reg || (await navigator.serviceWorker.ready.catch(() => null));
                const anyReg: any = reg as any;
                const periodic = anyReg && anyReg.periodicSync;
                if (periodic && typeof periodic.register === 'function') {
                  await periodic.register('saweg-periodic-sync-v1', {
                    minInterval: 15 * 60 * 1000,
                  });
                }
              } catch {
              }
            }
          } finally {
            try {
              el.remove();
            } catch {
            }
          }
        };

        actions.appendChild(enableBtn);
        actions.appendChild(closeBtn);

        el.appendChild(textWrap);
        el.appendChild(actions);
        document.body.appendChild(el);

        window.setTimeout(() => {
          try {
            el.remove();
          } catch {
          }
        }, 15000);
      } catch {
      }
    };

    const showSyncFailed = (payload: any) => {
      try {
        const id = 'saweg-sync-failed-toast';
        const existing = document.getElementById(id);
        if (existing) existing.remove();

        const lang = document.documentElement.lang === 'en' ? 'en' : 'ar';
        const text = lang === 'en' ? 'Something went wrong.' : 'حدث خطأ ما.';

        try {
          localStorage.setItem(
            'saweg:lastSyncFailed',
            JSON.stringify({
              at: Date.now(),
              text,
              payload,
            })
          );
        } catch {
        }

        const now = Date.now();
        const key = text;
        if (key === lastSyncFailedKey && now - lastSyncFailedAt < 10000) return;
        lastSyncFailedAt = now;
        lastSyncFailedKey = key;

        const el = document.createElement('div');
        el.id = id;
        el.textContent = text;
        el.setAttribute('role', 'status');
        el.setAttribute('aria-label', 'Sync failed');
        el.style.position = 'fixed';
        el.style.left = '50%';
        el.style.top = '16px';
        el.style.transform = 'translateX(-50%)';
        el.style.zIndex = '9999';
        el.style.background = 'rgba(239, 68, 68, 0.95)';
        el.style.color = '#ffffff';
        el.style.padding = '10px 14px';
        el.style.borderRadius = '9999px';
        el.style.fontSize = '14px';
        el.style.fontFamily = 'var(--font-sans)';
        el.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.2), 0 4px 6px -4px rgba(0,0,0,0.2)';
        el.style.maxWidth = 'calc(100vw - 32px)';
        el.style.whiteSpace = 'pre-wrap';
        el.style.textAlign = 'center';
        document.body.appendChild(el);

        window.setTimeout(() => {
          try {
            el.remove();
          } catch {
          }
        }, 20000);
      } catch {
      }
    };

    const requestQueueProcess = () => {
      if (isLighthouseRun) return;
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
      const payload = (event as any)?.data;
      const type = payload?.type;
      if (type === 'SYNC_SUCCESS') {
        showSyncSuccess();

        try {
          const p = window.location.pathname || '';
          if (p.endsWith('/providers') || p.endsWith('/merchant-goods-posts')) {
            window.setTimeout(() => {
              try {
                window.location.reload();
              } catch {
              }
            }, 300);
          }
        } catch {
        }
      }
      if (type === 'SYNC_FAILED') {
        try {
          if (!navigator.onLine) return;
        } catch {
        }
        showSyncFailed(payload);
      }
    };

    navigator.serviceWorker.addEventListener('message', onMessage);

    const disableSwInDev = process.env.NEXT_PUBLIC_DISABLE_SW_DEV === '1';

    if (process.env.NODE_ENV !== 'production' && disableSwInDev) {
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

        if (isLighthouseRun) {
          try {
            void reg.update().catch(() => null);
          } catch {
          }
          return () => {
          };
        }

        try {
          const anyReg: any = reg as any;
          const periodic = anyReg && anyReg.periodicSync;
          if (periodic && typeof periodic.register === 'function') {
            let permState: string | null = null;
            try {
              const p: any = await (navigator as any).permissions?.query?.({ name: 'periodic-background-sync' });
              permState = p && typeof p.state === 'string' ? p.state : null;
            } catch {
              permState = null;
            }

            if (permState !== 'denied') {
              try {
                await periodic.register('saweg-periodic-sync-v1', {
                  minInterval: 15 * 60 * 1000,
                });
              } catch {
              }
            }
          }
        } catch {
        }

        void showBackgroundPermissionPrompt({ reg }).catch(() => null);

        try {
          void reg.update().catch(() => null);
        } catch {
        }

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

        const onVisibilityChange = () => {
          try {
            if (document.visibilityState === 'visible' && navigator.onLine) {
              requestQueueProcess();
            }
          } catch {
          }
        };

        const startOnlineRetryWindow = () => {
          try {
            if (!navigator.onLine) return;
            let tries = 0;
            const id = window.setInterval(() => {
              tries += 1;
              requestQueueProcess();
              if (tries >= 6) {
                try {
                  window.clearInterval(id);
                } catch {
                }
              }
            }, 5000);
          } catch {
          }
        };

        window.addEventListener('online', onOnline);
        document.addEventListener('visibilitychange', onVisibilityChange);

        // Mobile browsers sometimes miss the first online event; retry a few times when we know we're online.
        startOnlineRetryWindow();

        requestQueueProcess();

        dispose = () => {
          try {
            window.removeEventListener('focus', onUpdateCheck);
            window.removeEventListener('online', onUpdateCheck);
            window.removeEventListener('saweg:warmup', onWarmup as EventListener);
            window.clearInterval(intervalId);
          } catch {
          }

          try {
            window.removeEventListener('online', onOnline);
          } catch {
          }

          try {
            document.removeEventListener('visibilitychange', onVisibilityChange);
          } catch {
          }
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
