'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import styles from './CarouselSection.module.css';
import { getLocationLabel } from '@/lib/locations';

interface Provider {
  id: number;
  userId?: string;
  name: string;           // used as title
  location: string;       // used as current location
  phone: string;          // phoneNumber
  image: string | null;   // path to uploaded image
  active: boolean;
  lastLocationUpdateAt?: string | Date;
  description?: string | null;
  destination?: string | null;
  placeOfBusiness?: string | null;
}

const CarouselSection: React.FC = () => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('carousel');
  const locale = useLocale();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [canAdd, setCanAdd] = useState(false);

  // Fetch providers on mount
  useEffect(() => {
    let cancelled = false;

    const loadAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        const type = data?.user?.type;
        const isAdmin = Boolean(data?.user?.isAdmin);
        setCanAdd(isAdmin || type === 'SHIPPER' || type === 'ADMIN');
      } catch {
        if (cancelled) return;
        setCanAdd(false);
      }
    };

    const fetchProviders = async () => {
      try {
        const res = await fetch('/api/providers');
        if (!res.ok) throw new Error('Failed to fetch');
        const data: Provider[] = await res.json();
        setProviders(data);
      } catch (err) {
        console.error('Error loading providers:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadAuth();
    fetchProviders();
    return () => {
      cancelled = true;
    };
  }, []);

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  const toTelHref = (phoneNumber: string) => {
    const normalized = phoneNumber.replace(/[^+\d]/g, '');
    return `tel:${normalized}`;
  };

  const formatPhoneForDisplay = (phoneNumber: string) => {
    const trimmed = (phoneNumber || '').trim();
    if (trimmed.endsWith('+') && !trimmed.startsWith('+')) {
      return `+${trimmed.slice(0, -1)}`;
    }
    return trimmed;
  };

  const trackCall = (providerId: number) => {
    try {
      void fetch(`/api/providers/${providerId}/calls`, {
        method: 'POST',
        keepalive: true,
      }).catch(() => null);
    } catch {
      // ignore
    }
  };

  // Loading state
  if (loading) {
    return (
      <section className={styles.carouselContainer}>
        <div className={styles.carouselTopBar}>
          {/* <h2 className={styles.carouselTitle}>{t('title')}</h2> */}
          {canAdd ? (
            <Link className={styles.addButton} href={`/${locale}/dashboard/add-provider`}>
              {t('addProvider')}
            </Link>
          ) : null}
        </div>
        <div className={styles.loading}>{t('loading') || 'جاري تحميل العروض...'}</div>
      </section>
    );
  }

  // Error state
  if (error || providers.length === 0) {
    return (
      <section className={styles.carouselContainer}>
        <div className={styles.carouselTopBar}>
          {/* <h2 className={styles.carouselTitle}>{t('title')}</h2> */}
          {canAdd ? (
            <Link className={styles.addButton} href={`/${locale}/dashboard/add-provider`}>
              {t('addProvider')}
            </Link>
          ) : null}
        </div>
        <div className={styles.emptyState}>
          {error
            ? t('error') || 'حدث خطأ أثناء تحميل العروض'
            : t('noProviders') || 'لا توجد عروض متاحة حالياً'}
        </div>
      </section>
    );
  }

  return (
    <section className={styles.carouselContainer}>
      <div className={styles.carouselTopBar}>
        {/* <h2 className={styles.carouselTitle}>{t('title')}</h2> */}
        {canAdd ? (
          <Link className={styles.addButton} href={`/${locale}/dashboard/add-provider`}>
            {t('addProvider')}
          </Link>
        ) : null}
      </div>
      <div className={styles.carousel} ref={carouselRef}>
        {providers.map((provider) => (
          <div key={provider.id} className={styles.carouselItem}>
            <div
              className={styles.imageContainer}
              style={{
                backgroundImage: provider.image ? `url(${provider.image})` : undefined,
              }}
            >
              <img
                src={provider.image || 'https://via.placeholder.com/330x380/F3F3F3/666666?text=Truck'}
                alt={provider.name}
                className={styles.productImage}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://via.placeholder.com/330x380/F3F3F3/666666?text=Truck';
                }}
              />
            </div>

            <div className={styles.contentWrapper}>
              <div className={styles.titleWrapper}>
                <Link
                  className={styles.productTitleLink}
                  href={provider.userId ? `/${locale}/users/${provider.userId}` : `/${locale}`}
                >
                  <h3 className={styles.productTitle}>{provider.name}</h3>
                </Link>
              </div>

              {provider.description && (
                <div className={styles.descriptionContainer}>
                  <p className={styles.description}>
                    {provider.description.split('\n').map((line, index) => (
                      <span key={index} className={styles.descriptionLine}>
                        {line}
                      </span>
                    ))}
                  </p>
                </div>
              )}

              {(provider.destination ?? provider.placeOfBusiness) && (
                <div className={styles.placeOfBusinessContainer}>
                  <p className={styles.placeOfBusiness}>
                    {t('destinationPrefix')}{' '}
                    <span className={styles.placeOfBusinessText}>
                      {getLocationLabel((provider.destination ?? provider.placeOfBusiness) ?? '', locale === 'ar' ? 'ar' : 'en')}
                    </span>
                  </p>
                </div>
              )}

              {(() => {
                const lastUpdateMs = provider.lastLocationUpdateAt
                  ? new Date(provider.lastLocationUpdateAt as any).getTime()
                  : NaN;
                const isStale = Number.isFinite(lastUpdateMs)
                  ? Date.now() - lastUpdateMs > 24 * 60 * 60 * 1000
                  : false;
                const dotClass = isStale
                  ? styles.statusDotStale
                  : provider.active
                    ? styles.statusDotActive
                    : styles.statusDotInactive;

                return (
                  <>
                    <div className={styles.currentLocationContainer}>
                      <span className={`${styles.currentLocationIcon} ${dotClass}`} aria-hidden="true" />
                      <p className={styles.currentLocation}>
                        {t('currentLocationPrefix')}{' '}
                        {getLocationLabel(provider.location || '-', locale === 'ar' ? 'ar' : 'en')}
                      </p>
                    </div>

                    <div className={styles.phoneContainer}>
                      <a
                        className={`${styles.phoneButton} ${isStale ? styles.phoneButtonStale : ''}`}
                        href={toTelHref(provider.phone)}
                        onClick={(e) => {
                          trackCall(provider.id);
                        }}
                        aria-label={`Call: ${provider.phone}`}
                        title={t('call') || 'Call'}
                      >
                        <span className={styles.phoneNumberIcon}>📞</span>
                        <span dir="ltr" className={`${styles.phoneNumberText} ${styles.phoneNumberLtr}`}>
                          {formatPhoneForDisplay(provider.phone)}
                        </span>
                      </a>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.carouselControls}>
        <button
          className={styles.controlButton}
          onClick={scrollLeft}
          aria-label={t('scrollLeft')}
        >
          ‹
        </button>
        <button
          className={styles.controlButton}
          onClick={scrollRight}
          aria-label={t('scrollRight')}
        >
          ›
        </button>
      </div>
    </section>
  );
};

export default CarouselSection;