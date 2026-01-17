'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Globe, ChevronDown, Menu, X, Bell, Loader2 } from 'lucide-react';
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

  const isRTL = locale === 'ar';

  // Adjust the extraOffset to make the scroll more aggressive
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
      const sw = reg.installing || reg.waiting;
      if (!sw) return;
      await withTimeout(
        new Promise<void>((resolve) => {
          const onState = () => {
            if (sw.state === 'activated' || sw.state === 'redundant') {
              sw.removeEventListener('statechange', onState);
              resolve();
            }
          };
          sw.addEventListener('statechange', onState);
          onState();
        }),
        5000
      ).catch(() => null);
    };

    try {
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      }
      await waitForActive(reg);
      return reg;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let cancelled = false;

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
        // ignore
      }

      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        setShowPushBanner(false);
        return;
      }

      if (Notification.permission === 'denied') {
        setShowPushBanner(false);
        return;
      }

      setCheckingPush(true);
      try {
        const reg = await getPushRegistration();
        if (!reg) {
          setShowPushBanner(false);
          return;
        }
        const existing = await reg.pushManager.getSubscription();
        if (cancelled) return;
        setShowPushBanner(!existing);
      } catch {
        if (cancelled) return;
        setShowPushBanner(false);
      } finally {
        if (cancelled) return;
        setCheckingPush(false);
      }
    };

    void check();
    return () => {
      cancelled = true;
    };
  }, [authUser?.id, authUser?.type, authUser?.isAdmin]);

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

  const enablePushFromBanner = async () => {
    if (enablingPush) return;
    setEnablingPush(true);

    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        return;
      }

      let permission: NotificationPermission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      if (permission !== 'granted') {
        return;
      }

      const reg = await getPushRegistration();
      if (!reg) return;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(existing),
        }).catch(() => null);
        setShowPushBanner(false);
        return;
      }

      const keyRes = await fetch('/api/push/public-key', { cache: 'no-store' });
      const keyData = await keyRes.json().catch(() => null);
      if (!keyRes.ok || !keyData?.publicKey) {
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(String(keyData.publicKey)),
      });

      const saveRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(sub),
      });
      if (!saveRes.ok) {
        return;
      }

      setShowPushBanner(false);
    } finally {
      setEnablingPush(false);
    }
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
                <Bell className={styles.pushBannerIcon} size={16} />
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
        <div
          className={`${styles.flexContainer} ${
            isRTL ? styles.flexRowReverse : styles.flexRow
          }`}
        >
          {/* Logo - Far right in LTR, Far left in RTL */}
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
            {isRTL ? (
              <>
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
                      <div
                        className={styles.userDropdown}
                        style={isRTL ? ({ left: 0, right: 'auto' } as any) : undefined}
                        role="menu"
                      >
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
              </>
            ) : (
              <>
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