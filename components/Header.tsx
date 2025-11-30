'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Globe, ChevronDown, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import styles from './Header.module.css';

export default function Header() {
  const t = useTranslations('header');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('hero');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isRTL = locale === 'ar';

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
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

  return (
    <header className={styles.header}>
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
              onClick={() => handleNavClick('about')}
              className={`${styles.navButton} ${
                activeSection === 'about'
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

          {/* Language Switcher & Contact - Desktop */}
          <div className={styles.desktopActions}>
            {/* Contact Button */}
            <button
              onClick={() => handleNavClick('contact')}
              className={styles.contactButton}
            >
              {t('contactUs')}
            </button>

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
              onClick={() => handleMobileNavClick('about')}
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
            <button
              onClick={() => handleMobileNavClick('contact')}
              className={styles.mobileNavLink}
            >
              {t('contactUs')}
            </button>

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
