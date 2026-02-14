'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Globe, ChevronDown, Menu, X, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import styles from './Header.module.css';

export default function Header() {
  const t = useTranslations('header');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const headerRef = useRef<HTMLElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('hero');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [authUser, setAuthUser] = useState<null | {
    id?: string;
    type?: string | null;
    isAdmin?: boolean;
    fullName?: string | null;
    profileImage?: string | null;
  }>(null);

  const [showPushBanner, setShowPushBanner] = useState(false);
  const [checkingPush, setCheckingPush] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);

  const showPushToast = (type: 'success' | 'error', message: string) => {
    try {
      const id = 'saweg-push-toast';
      const existing = document.getElementById(id);
      if (existing) existing.remove();

      const el = document.createElement('div');
      el.id = id;
      el.textContent = message;
      el.setAttribute('role', 'status');
      el.style.position = 'fixed';
      el.style.left = '50%';
      el.style.top = '16px';
      el.style.transform = 'translateX(-50%)';
      el.style.zIndex = '10001';
      el.style.maxWidth = 'calc(100vw - 32px)';
      el.style.whiteSpace = 'pre-wrap';
      el.style.textAlign = 'center';
      el.style.background = type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)';
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
      }, 4500);
    } catch {
    }
  };

  const extraOffset = -55; // Adjust this value to make the scroll less aggressive

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerHeight = headerRef.current?.offsetHeight ?? 0;
      const elementTop = element.getBoundingClientRect().top + window.scrollY;
      const scrollTop = Math.max(elementTop - headerHeight - extraOffset, 0);
      window.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      });
    }
    setActiveSection(sectionId);
  };

  const handleNavClick = (sectionId: string) => {
    const homePath = `/${locale}`;
    const isOnHome = pathname === homePath || pathname === `${homePath}/`;

    if (isOnHome) {
      scrollToSection(sectionId);
    } else {
      router.push(`${homePath}#${sectionId}`);
    }
  };

  const handleMobileNavClick = (sectionId: string) => {
    handleNavClick(sectionId);
    setIsMenuOpen(false);
  };

  const switchLocale = (newLocale: string) => {
    const path = pathname.split('/').slice(2).join('/');
    router.push(`/${newLocale}/${path}`);
    setIsLangOpen(false);
    setIsMenuOpen(false);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        const data = await res.json();
        if (cancelled) return;
        setAuthUser(data?.user ?? null);
      } catch {
        if (cancelled) return;
        setAuthUser(null);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const getPushRegistration = async (): Promise<ServiceWorkerRegistration | null> => {
    if (typeof window === 'undefined') return null;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;

    const withTimeout = async <T,>(p: Promise<T>, ms: number): Promise<T> => {
      return await Promise.race([
        p,
        new Promise<T>((_, reject) => {
          window.setTimeout(() => reject(new Error('SW_TIMEOUT')), ms);
        }),
      ]);
    };

    const waitForActive = async (reg: ServiceWorkerRegistration) => {
      if (reg.active) return;

      await withTimeout(
        new Promise<void>((resolve) => {
          let sw: ServiceWorker | null = reg.installing || reg.waiting || null;

          const cleanup = () => {
            try {
              reg.removeEventListener('updatefound', onUpdateFound);
              navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
              sw?.removeEventListener('statechange', onStateChange);
            } catch {
            }
          };

          const maybeResolve = () => {
            if (reg.active) {
              cleanup();
              resolve();
            }
          };

          const onStateChange = () => {
            if (!sw) return;
            if (sw.state === 'activated' || sw.state === 'redundant') {
              maybeResolve();
            }
          };

          const onUpdateFound = () => {
            try {
              sw?.removeEventListener('statechange', onStateChange);
            } catch {
            }
            sw = reg.installing || null;
            sw?.addEventListener('statechange', onStateChange);
            onStateChange();
          };

          const onControllerChange = () => {
            maybeResolve();
          };

          reg.addEventListener('updatefound', onUpdateFound);
          navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
          sw?.addEventListener('statechange', onStateChange);
          maybeResolve();
        }),
        8000
      ).catch(() => null);
    };

    try {
      let reg: ServiceWorkerRegistration | undefined;
      try {
        reg = await navigator.serviceWorker.getRegistration('/');
      } catch {
        reg = undefined;
      }
      if (!reg) {
        reg = await navigator.serviceWorker.getRegistration();
      }
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      }
      await waitForActive(reg);

      const readyReg = await withTimeout(navigator.serviceWorker.ready, 8000).catch(() => null);
      return readyReg ?? reg;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let cancelled = false;
    let permStatus: PermissionStatus | null = null;

    const ensureSubscribedOnce = async () => {
      if (!authUser?.id) return;
      const attemptedKey = `push_auto_attempted:${authUser.id}`;
      try {
        if (sessionStorage.getItem(attemptedKey) === '1') return;
        sessionStorage.setItem(attemptedKey, '1');
      } catch {
      }

      setCheckingPush(true);
      try {
        const reg = await getPushRegistration();
        if (!reg) return;
        const existing = await reg.pushManager.getSubscription();
        if (existing) return;

        const keyRes = await fetch('/api/push/public-key', { cache: 'no-store' }).catch(() => null);
        if (!keyRes) return;
        const keyData = await keyRes.json().catch(() => null);
        if (!keyRes.ok || !keyData?.publicKey) return;

        const publicKeyRaw = String(keyData.publicKey);
        const publicKey = publicKeyRaw.trim().replace(/^['"]+|['"]+$/g, '');
        if (!publicKey) return;

        let appServerKeyBytes: Uint8Array;
        try {
          appServerKeyBytes = urlBase64ToUint8Array(publicKey);
        } catch {
          return;
        }
        if (appServerKeyBytes.length !== 65) return;

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKeyBytes as unknown as BufferSource,
        });

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(sub),
        }).catch(() => null);
      } catch (err) {
        // Silently fail for push service errors - this is a browser/network connectivity issue
        // and shouldn't be logged as an application error
        const isPushServiceError = err instanceof Error && 
          (/push service error/i.test(err.message) || err.name === 'AbortError');
        
        if (!isPushServiceError) {
          console.error('Push auto-subscribe failed:', err);
        }
      } finally {
        if (!cancelled) setCheckingPush(false);
      }
    };

    const check = async () => {
      if (typeof window === 'undefined') return;
      if (!authUser?.id) return;

      const userType = authUser.type ?? (authUser.isAdmin ? 'ADMIN' : null);
      const canUsePush = userType === 'SHIPPER' || userType === 'ADMIN';
      if (!canUsePush) {
        setShowPushBanner(false);
        return;
      }

      const dismissedKey = `push_banner_dismissed:${authUser.id}`;
      try {
        if (sessionStorage.getItem(dismissedKey) === '1') {
          setShowPushBanner(false);
          return;
        }
      } catch {
      }

      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        setShowPushBanner(false);
        return;
      }

      const permission = Notification.permission;
      if (permission === 'granted') {
        setShowPushBanner(false);
        void ensureSubscribedOnce();
        return;
      }

      if (permission === 'default' || permission === 'denied') {
        setShowPushBanner(true);
        return;
      }

      setShowPushBanner(false);
    };

    void check();

    const setupPermissionListener = async () => {
      if (!('permissions' in navigator)) return;
      try {
        permStatus = await (navigator.permissions as any).query({ name: 'notifications' });
        if (!permStatus) return;
        permStatus.onchange = () => {
          if (cancelled) return;
          void check();
        };
      } catch {
      }
    };

    void setupPermissionListener();
    return () => {
      cancelled = true;
      if (permStatus) permStatus.onchange = null;
    };
  }, [authUser?.id, authUser?.type, authUser?.isAdmin]);

  const enablePushFromBanner = async () => {
    if (enablingPush) return;
    setEnablingPush(true);

    const withTimeout = async <T,>(p: Promise<T>, ms: number): Promise<T> => {
      return await Promise.race([
        p,
        new Promise<T>((_, reject) => {
          window.setTimeout(() => reject(new Error('TIMEOUT')), ms);
        }),
      ]);
    };

    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        showPushToast('error', locale === 'ar' ? 'هذا الجهاز لا يدعم إشعارات الويب.' : 'This device does not support web push notifications.');
        return;
      }

      const isLocalhost =
        location.hostname === 'localhost' ||
        location.hostname === '127.0.0.1' ||
        location.hostname === '[::1]';
      if (!window.isSecureContext && !isLocalhost) {
        showPushToast(
          'error',
          locale === 'ar'
            ? 'لتفعيل الإشعارات يجب فتح الموقع عبر HTTPS.'
            : 'Notifications require HTTPS.'
        );
        return;
      }

      let permission: NotificationPermission = Notification.permission;
      if (permission === 'default') {
        try {
          permission = await Notification.requestPermission();
        } catch {
          permission = Notification.permission;
        }
      }
      if (permission !== 'granted') {
        showPushToast(
          'error',
          locale === 'ar'
            ? 'لم يتم السماح بالإشعارات. يمكنك تفعيلها من إعدادات المتصفح.'
            : 'Notifications were not allowed. You can enable them in your browser settings.'
        );
        return;
      }

      setShowPushBanner(false);

      const reg = await getPushRegistration();
      if (!reg) {
        showPushToast('error', locale === 'ar' ? 'تعذر تفعيل الإشعارات.' : 'Could not enable notifications.');
        return;
      }

      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(existing),
        }).catch(() => null);
        setShowPushBanner(false);
        showPushToast('success', locale === 'ar' ? 'تم تفعيل الإشعارات.' : 'Notifications enabled.');
        return;
      }

      const keyRes = await withTimeout(fetch('/api/push/public-key', { cache: 'no-store' }), 12000).catch(() => null);
      if (!keyRes) {
        showPushToast('error', locale === 'ar' ? 'تعذر الاتصال بالخادم.' : 'Could not reach the server.');
        return;
      }

      const keyData = await keyRes.json().catch(() => null);
      if (!keyRes.ok || !keyData?.publicKey) {
        const msg =
          typeof keyData?.error === 'string' && keyData.error
            ? keyData.error
            : locale === 'ar'
              ? 'الإشعارات غير مهيأة حالياً.'
              : 'Notifications are not configured.';
        showPushToast('error', msg);
        return;
      }

      const publicKeyRaw = String(keyData.publicKey);
      const publicKey = publicKeyRaw.trim().replace(/^['"]+|['"]+$/g, '');
      if (!publicKey) {
        showPushToast('error', locale === 'ar' ? 'الإشعارات غير مهيأة حالياً.' : 'Notifications are not configured.');
        return;
      }

      if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(publicKey)) {
        showPushToast(
          'error',
          locale === 'ar'
            ? 'مفتاح الإشعارات غير صالح. تأكد من إعداد VAPID_PUBLIC_KEY بشكل صحيح.'
            : 'Invalid push public key. Please verify VAPID_PUBLIC_KEY configuration.'
        );
        return;
      }

      let appServerKeyBytes: Uint8Array;
      try {
        appServerKeyBytes = urlBase64ToUint8Array(publicKey);
      } catch {
        showPushToast(
          'error',
          locale === 'ar'
            ? 'مفتاح الإشعارات غير صالح. تأكد من إعداد VAPID_PUBLIC_KEY بشكل صحيح.'
            : 'Invalid push public key. Please verify VAPID_PUBLIC_KEY configuration.'
        );
        return;
      }

      if (appServerKeyBytes.length !== 65) {
        showPushToast(
          'error',
          locale === 'ar'
            ? 'مفتاح الإشعارات غير صالح. تأكد من استخدام VAPID_PUBLIC_KEY الصحيح.'
            : 'Invalid push public key. Please verify you are using the correct VAPID_PUBLIC_KEY.'
        );
        return;
      }

      const appServerKey = appServerKeyBytes as unknown as BufferSource;

      let sub: PushSubscription;
      try {
        sub = await withTimeout(
          reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: appServerKey,
          }),
          15000
        );
      } catch (err: any) {
        const name = typeof err?.name === 'string' ? err.name : '';
        const message = typeof err?.message === 'string' ? err.message : '';
        const isAbort = name === 'AbortError' || /push service error/i.test(message);
        const isInvalidKey = name === 'InvalidAccessError' || /applicationServerKey/i.test(message);
        const isNotAllowed = name === 'NotAllowedError' || /denied/i.test(message);
        
        // Only log non-push-service errors to console
        if (!isAbort) {
          try {
            console.error('Push subscribe failed:', err);
          } catch {
          }
        }
        
        showPushToast(
          'error',
          isInvalidKey
            ? locale === 'ar'
              ? 'مفتاح الإشعارات غير صالح. تأكد من إعداد VAPID_PUBLIC_KEY.'
              : 'Invalid push public key. Please verify VAPID_PUBLIC_KEY.'
            : isNotAllowed
              ? locale === 'ar'
                ? 'لم يتم السماح بالإشعارات. يمكنك تفعيلها من إعدادات المتصفح.'
                : 'Notifications were not allowed. You can enable them in your browser settings.'
              : isAbort
                ? locale === 'ar'
                  ? 'تعذر التسجيل في خدمة الإشعارات. تأكد من الاتصال أو جرّب لاحقاً.'
                  : 'Could not register with the push service. Check your connection and try again.'
                : locale === 'ar'
                  ? 'تعذر تفعيل الإشعارات.'
                  : 'Could not enable notifications.'
        );
        return;
      }

      const saveRes = await withTimeout(
        fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(sub),
        }),
        12000
      ).catch(() => null);

      if (!saveRes) {
        showPushToast('error', locale === 'ar' ? 'تعذر حفظ الاشتراك.' : 'Could not save subscription.');
        return;
      }
      if (!saveRes.ok) {
        const data = await saveRes.json().catch(() => null);
        const errMsg =
          typeof data?.error === 'string' && data.error
            ? data.error
            : locale === 'ar'
              ? 'تعذر حفظ الاشتراك.'
              : 'Could not save subscription.';
        showPushToast('error', errMsg);
        return;
      }

      setShowPushBanner(false);
      showPushToast('success', locale === 'ar' ? 'تم تفعيل الإشعارات.' : 'Notifications enabled.');
    } finally {
      setEnablingPush(false);
    }
  };

  const dismissPushBanner = () => {
    if (!authUser?.id) {
      setShowPushBanner(false);
      return;
    }
    try {
      sessionStorage.setItem(`push_banner_dismissed:${authUser.id}`, '1');
    } catch {
      // ignore
    }
    setShowPushBanner(false);
  };

  useEffect(() => {
    if (!isUserMenuOpen) return;

    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsUserMenuOpen(false);
    };

    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isUserMenuOpen]);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setAuthUser(null);
      setIsUserMenuOpen(false);
      router.push(`/${locale}`);
      router.refresh();
    }
  };

  const avatarLetter = (authUser?.fullName || '?').trim().slice(0, 1).toUpperCase();

  return (
    <header ref={headerRef} className={styles.header}>
      {authUser ? (
        showPushBanner ? (
          <div className={styles.pushBanner} role="region" aria-label={locale === 'ar' ? 'تنبيه الإشعارات' : 'Notifications banner'}>
            <div className={styles.pushBannerInner}>
              <div className={styles.pushBannerText}>
                <img src="/icons/logo_icon.svg" alt="" className={styles.pushBannerIcon} />
                <span>
                  {locale === 'ar'
                    ? 'فعّل الإشعارات لتصلك العروض الجديدة فوراً.'
                    : 'Enable notifications to get new offers instantly.'}
                </span>
              </div>

              <div className={styles.pushBannerActions}>
                <button
                  type="button"
                  className={styles.pushBannerButton}
                  onClick={() => void enablePushFromBanner()}
                  disabled={enablingPush || checkingPush}
                >
                  {enablingPush ? (
                    <span className={styles.pushBannerButtonInner}>
                      <Loader2 size={14} className={styles.spin} />
                      {locale === 'ar' ? 'جارِ التفعيل...' : 'Enabling...'}
                    </span>
                  ) : (
                    locale === 'ar' ? 'تفعيل' : 'Activate'
                  )}
                </button>
                <button
                  type="button"
                  className={styles.pushBannerDismiss}
                  onClick={dismissPushBanner}
                  aria-label={locale === 'ar' ? 'إغلاق' : 'Dismiss'}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        ) : null
      ) : null}
      <div className={styles.container}>
        <div className={styles.flexContainer}>
          {/* Logo */}
          <div className={styles.logoWrapper}>
            <Link href={`/${locale}`} className={styles.logoLink}>
              <Image
                src="/images/logo.png"
                alt="Saweg logo"
                width={120}
                height={48}
                priority
                className={styles.logoImage}
              />
            </Link>
          </div>

          {/* Navigation - Middle (desktop) */}
          <nav className={styles.nav}>
            <button
              onClick={() => handleNavClick('hero')}
              className={`${styles.navButton} ${
                activeSection === 'hero'
                  ? styles.navButtonActive
                  : styles.navButtonInactive
              }`}
            >
              {t('mainPage')}
            </button>
            <button
              onClick={() => handleNavClick('features')}
              className={`${styles.navButton} ${
                activeSection === 'features'
                  ? styles.navButtonActive
                  : styles.navButtonInactive
              }`}
            >
              {t('aboutUs')}
            </button>
            <button
              onClick={() => handleNavClick('partners')}
              className={`${styles.navButton} ${
                activeSection === 'partners'
                  ? styles.navButtonActive
                  : styles.navButtonInactive
              }`}
            >
              {t('bePartners')}
            </button>
          </nav>

          {/* Registration & Language Switcher - Desktop */}
          <div className={styles.desktopActions}>
            {/* Language Dropdown */}
            <div className={styles.langWrapper}>
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className={styles.langButton}
              >
                <span>{t('language')}</span>
                <ChevronDown className={styles.iconSmall} />
              </button>

              <div className={styles.globeWrapper}>
                <Globe className={styles.globeIcon} />
              </div>

              {isLangOpen && (
                <div className={styles.langDropdown}>
                  <button
                    onClick={() => switchLocale('en')}
                    className={styles.langOption}
                  >
                    English
                  </button>
                  <button
                    onClick={() => switchLocale('ar')}
                    className={styles.langOption}
                  >
                    العربية
                  </button>
                </div>
              )}
            </div>

            {authUser ? (
              <div className={styles.userMenuWrapper} ref={userMenuRef}>
                <button
                  type="button"
                  className={styles.avatarButton}
                  onClick={() => setIsUserMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={isUserMenuOpen ? 'true' : 'false'}
                  aria-label={t('myProfile')}
                >
                  {authUser.profileImage ? (
                    <img className={styles.avatarImage} src={authUser.profileImage} alt={authUser.fullName ?? ''} />
                  ) : (
                    <span className={styles.avatarPlaceholder} aria-hidden="true">
                      {avatarLetter}
                    </span>
                  )}
                </button>

                {isUserMenuOpen ? (
                  <div className={styles.userDropdown} role="menu">
                    <Link
                      href={`/${locale}/dashboard/my-posts`}
                      className={styles.userDropdownItem}
                      onClick={() => setIsUserMenuOpen(false)}
                      role="menuitem"
                    >
                      {t('myPosts')}
                    </Link>
                    <Link
                      href={`/${locale}/my-profile`}
                      className={styles.userDropdownItem}
                      onClick={() => setIsUserMenuOpen(false)}
                      role="menuitem"
                    >
                      {t('myProfile')}
                    </Link>
                    {authUser.isAdmin ? (
                      <Link
                        href={`/${locale}/admin`}
                        className={styles.userDropdownItem}
                        onClick={() => setIsUserMenuOpen(false)}
                        role="menuitem"
                      >
                        {t('admin')}
                      </Link>
                    ) : null}
                    <button type="button" onClick={logout} className={styles.userDropdownItemButton} role="menuitem">
                      {t('logout')}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                <Link href={`/${locale}/login`} className={styles.authLink}>
                  {t('login')}
                </Link>
                <Link href={`/${locale}/register`} className={`${styles.authLink} ${styles.signupButton}`}>
                  {t('signup')}
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className={styles.mobileMenuBtnWrapper}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={styles.mobileMenuBtn}
              aria-label="Toggle navigation menu"
            >
              {isMenuOpen ? <X className={styles.iconMedium} /> : <Menu className={styles.iconMedium} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {isMenuOpen && (
        <div className={styles.mobileMenu}>
          <div className={styles.mobileMenuContent}>
            <button
              onClick={() => handleMobileNavClick('hero')}
              className={styles.mobileNavLink}
            >
              {t('mainPage')}
            </button>
            <button
              onClick={() => handleMobileNavClick('features')}
              className={styles.mobileNavLink}
            >
              {t('aboutUs')}
            </button>
            <button
              onClick={() => handleMobileNavClick('partners')}
              className={styles.mobileNavLink}
            >
              {t('bePartners')}
            </button>

            {authUser ? (
              <>
                <Link href={`/${locale}/dashboard/my-posts`} className={styles.mobileNavLink}>
                  {t('myPosts')}
                </Link>
                <Link href={`/${locale}/my-profile`} className={styles.mobileNavLink}>
                  {t('myProfile')}
                </Link>
                {authUser.isAdmin ? (
                  <Link href={`/${locale}/admin`} className={styles.mobileNavLink}>
                    {t('admin')}
                  </Link>
                ) : null}
                <button type="button" onClick={logout} className={styles.mobileNavLink}>
                  {t('logout')}
                </button>
              </>
            ) : (
              <>
                <Link href={`/${locale}/login`} className={styles.mobileNavLink}>
                  {t('login')}
                </Link>
                <Link href={`/${locale}/register`} className={`${styles.mobileNavLink} ${styles.mobileSignupButton}`}>
                  {t('signup')}
                </Link>
              </>
            )}

            <div className={styles.mobileLangWrapper}>
              <span className="text-xs text-gray-500">{t('language')}</span>
              <button
                onClick={() => switchLocale('en')}
                className={styles.mobileLangBtn}
              >
                EN
              </button>
              <button
                onClick={() => switchLocale('ar')}
                className={styles.mobileLangBtn}
              >
                AR
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}