'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Globe, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  const t = useTranslations('header');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('hero');

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

  const switchLocale = (newLocale: string) => {
    const path = pathname.split('/').slice(2).join('/');
    router.push(`/${newLocale}/${path}`);
    setIsLangOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white z-50">
      <div className="max-w-6xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo - Far right in LTR, Far left in RTL */}
          <div className="flex items-center">
            <Link href={`/${locale}`} className="flex items-center">
              <Image
                src="/images/logo.png"
                alt="Saweg logo"
                width={120}
                height={48}
                priority
                className="h-auto w-auto"
              />
            </Link>
          </div>

          {/* Navigation - Middle */}
          <nav className="flex items-center gap-8">
            <button
              onClick={() => handleNavClick('hero')}
              className={`pb-1 border-b-2 text-sm font-medium transition-colors ${
                activeSection === 'hero'
                  ? 'border-[#FFB81C] text-gray-900'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('mainPage')}
            </button>
            <button
              onClick={() => handleNavClick('about')}
              className={`pb-1 border-b-2 text-sm font-medium transition-colors ${
                activeSection === 'about'
                  ? 'border-[#FFB81C] text-gray-900'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('aboutUs')}
            </button>
            <button
              onClick={() => handleNavClick('partners')}
              className={`pb-1 border-b-2 text-sm font-medium transition-colors ${
                activeSection === 'partners'
                  ? 'border-[#FFB81C] text-gray-900'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('bePartners')}
            </button>
          </nav>

          {/* Language Switcher & Contact - Far left in LTR, Far right in RTL */}
          <div className="flex items-center gap-4">
            {/* Contact Button */}
            <button
              onClick={() => handleNavClick('contact')}
              className="px-6 py-2 rounded-full bg-[#FFB81C] text-white font-semibold hover:bg-[#e6a517] transition-colors"
            >
              {t('contactUs')}
            </button>

            {/* Language Dropdown */}
            <div className="relative flex items-center gap-3">
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-1 text-sm font-medium text-gray-900 hover:text-gray-700"
              >
                <span>{t('language')}</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center w-9 h-9 rounded-full border border-black">
                <Globe className="w-4 h-4 text-black" />
              </div>

              {isLangOpen && (
                <div className="absolute top-full mt-2 bg-white shadow-lg rounded-lg overflow-hidden min-w-[150px] right-0">
                  <button
                    onClick={() => switchLocale('en')}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                  >
                    English
                  </button>
                  <button
                    onClick={() => switchLocale('ar')}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                  >
                    العربية
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
