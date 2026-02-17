'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const [mounted, setMounted] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    // Check if already installed (standalone mode)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    // Check if dismissed recently
    try {
      const dismissed = localStorage.getItem('saweg:installDismissed');
      if (dismissed) {
        const dismissedAt = Number(dismissed);
        // Don't show for 7 days after dismissal
        if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
      }
    } catch {}

    // Detect iOS
    const ua = navigator.userAgent || '';
    const isiOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isiOS);

    // For iOS, show the banner with manual instructions (no beforeinstallprompt on Safari)
    if (isiOS) {
      // Only show on Safari
      const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
      if (isSafari) {
        setTimeout(() => setShowBanner(true), 3000);
      }
      return;
    }

    // For Android/Desktop Chrome/Edge - listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Fallback: Show banner on localhost for testing (beforeinstallprompt doesn't fire on http://)
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      setTimeout(() => setShowBanner(true), 2000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [mounted]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    try {
      localStorage.setItem('saweg:installDismissed', String(Date.now()));
    } catch {}
  };

  if (!mounted || isStandalone || !showBanner) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        color: '#fff',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
        direction: isAr ? 'rtl' : 'ltr',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '2px' }}>
          {isAr ? 'تثبيت تطبيق سواق' : 'Install Saweg'}
        </div>
        <div style={{ fontSize: '13px', color: '#94a3b8' }}>
          {isIOS
            ? (isAr
                ? 'اضغط على زر المشاركة ثم "إضافة إلى الشاشة الرئيسية"'
                : 'Tap the share button, then "Add to Home Screen"')
            : (isAr
                ? 'ثبّت التطبيق للوصول السريع'
                : 'Install for quick access')}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        {!isIOS && deferredPrompt && (
          <button
            onClick={handleInstall}
            style={{
              background: '#FFB81C',
              color: '#111827',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {isAr ? 'تثبيت' : 'Install'}
          </button>
        )}
        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            color: '#94a3b8',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '14px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {isAr ? 'لاحقاً' : 'Later'}
        </button>
      </div>
    </div>
  );
}
