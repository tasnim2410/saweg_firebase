'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Globe, ChevronDown, Menu, X } from 'lucide-react';
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
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('hero');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [authUser, setAuthUser] = useState<null | { isAdmin?: boolean }>(null);

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

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setAuthUser(null);
      router.push(`/${locale}`);
      router.refresh();
    }
  };

  return (
    <header ref={headerRef} className={styles.header}>
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
            {authUser ? (
              <>
                <Link href={`/${locale}/dashboard/my-posts`} className={styles.authLink}>
                  {t('myPosts')}
                </Link>
                <Link href={`/${locale}/my-profile`} className={styles.authLink}>
                  {t('myProfile')}
                </Link>
                {authUser.isAdmin ? (
                  <Link href={`/${locale}/admin`} className={styles.authLink}>
                    {t('admin')}
                  </Link>
                ) : null}
                <button type="button" onClick={logout} className={styles.authButton}>
                  {t('logout')}
                </button>
              </>
            ) : (
              <>
                <Link href={`/${locale}/login`} className={styles.authLink}>
                  {t('login')}
                </Link>
                <Link href={`/${locale}/register`} className={styles.authLink}>
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
                <Link href={`/${locale}/register`} className={styles.mobileNavLink}>
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