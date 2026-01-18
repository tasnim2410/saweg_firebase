'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import styles from './CarouselSection.module.css';
import { getLocationLabel } from '@/lib/locations';
import { Share2 } from 'lucide-react';

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
  publishedByAdmin?: boolean;
}

const CarouselSection: React.FC = () => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('carousel');
  const locale = useLocale();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [canAdd, setCanAdd] = useState(false);
  const [openShareForId, setOpenShareForId] = useState<number | null>(null);
  const [copiedForId, setCopiedForId] = useState<number | null>(null);
  const sharePopoverRef = useRef<HTMLDivElement | null>(null);

  const endpoint = '/api/providers';
  const addHref = `/${locale}/dashboard/add-provider`;
  const callsEndpointFor = (id: number) => `/api/providers/${id}/calls`;
  const title = locale === 'ar' ? 'عروض السوّاق' : 'Shippers offers';

  const buildShareUrlForProvider = (providerId: number) => {
    if (typeof window === 'undefined') return `/${locale}/providers/${providerId}`;
    return `${window.location.origin}/${locale}/providers/${providerId}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // ignore
    }

    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  };

  const handleShare = async (provider: Provider) => {
    const shareUrl = buildShareUrlForProvider(provider.id);
    const shareTitle = provider.name;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: shareTitle,
          text: provider.description || undefined,
          url: shareUrl,
        });
        return;
      } catch {
        // fall back to popover
      }
    }

    setOpenShareForId((prev) => (prev === provider.id ? null : provider.id));
  };

  useEffect(() => {
    if (openShareForId === null) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (sharePopoverRef.current && !sharePopoverRef.current.contains(target)) {
        setOpenShareForId(null);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenShareForId(null);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openShareForId]);

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
        const res = await fetch(endpoint);
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
      void fetch(callsEndpointFor(providerId), {
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
          <h2 className={styles.carouselTitle}>{title}</h2>
          {canAdd ? (
            <Link className={styles.addButton} href={addHref}>
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
          <h2 className={styles.carouselTitle}>{title}</h2>
          {canAdd ? (
            <Link className={styles.addButton} href={addHref}>
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
        <h2 className={styles.carouselTitle}>{title}</h2>
        {canAdd ? (
          <Link className={styles.addButton} href={addHref}>
            {t('addProvider')}
          </Link>
        ) : null}
      </div>

      {/* Left Arrow */}
      <button
        className={`${styles.carouselArrow} ${styles.carouselArrowLeft}`}
        onClick={scrollLeft}
        aria-label={t('scrollLeft')}
      >
        ›
      </button>
      
      {/* Carousel */}
      <div className={styles.carousel} ref={carouselRef}>
        {providers.map((provider) => (
          <div key={provider.id} className={styles.carouselItem}>
            <div
              className={styles.imageContainer}
              style={{
                backgroundImage: provider.image ? `url(${provider.image})` : undefined,
              }}
            >
              <div className={styles.shareWrapper} ref={openShareForId === provider.id ? sharePopoverRef : undefined}>
                <button
                  type="button"
                  className={styles.shareButton}
                  onClick={() => void handleShare(provider)}
                  aria-label={t('share') || 'Share'}
                  title={t('share') || 'Share'}
                >
                  <Share2 size={18} aria-hidden="true" />
                </button>

                {openShareForId === provider.id ? (
                  <div className={styles.shareMenu} role="menu" aria-label={t('share') || 'Share'}>
                    {(() => {
                      const shareUrl = buildShareUrlForProvider(provider.id);
                      const shareTitle = provider.name;
                      const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
                      const xUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`;
                      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareTitle} ${shareUrl}`)}`;
                      const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

                      return (
                        <>
                          <a
                            className={styles.shareMenuItem}
                            href={facebookUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            role="menuitem"
                            onClick={() => setOpenShareForId(null)}
                          >
                            {t('shareFacebook') || 'Facebook'}
                          </a>
                          <a
                            className={styles.shareMenuItem}
                            href={xUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            role="menuitem"
                            onClick={() => setOpenShareForId(null)}
                          >
                            {t('shareX') || 'X'}
                          </a>
                          <a
                            className={styles.shareMenuItem}
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            role="menuitem"
                            onClick={() => setOpenShareForId(null)}
                          >
                            {t('shareWhatsApp') || 'WhatsApp'}
                          </a>
                          <a
                            className={styles.shareMenuItem}
                            href={linkedInUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            role="menuitem"
                            onClick={() => setOpenShareForId(null)}
                          >
                            {t('shareLinkedIn') || 'LinkedIn'}
                          </a>
                          <button
                            type="button"
                            className={styles.shareMenuItemButton}
                            role="menuitem"
                            onClick={async () => {
                              const ok = await copyToClipboard(shareUrl);
                              if (ok) {
                                setCopiedForId(provider.id);
                                window.setTimeout(() => setCopiedForId(null), 1200);
                              }
                            }}
                          >
                            {copiedForId === provider.id ? (t('copied') || 'Copied!') : (t('copyLink') || 'Copy link')}
                          </button>
                        </>
                      );
                    })()}
                  </div>
                ) : null}
              </div>

              <Link href={`/${locale}/providers/${provider.id}`} aria-label={provider.name} style={{ display: 'block' }}>
                <img
                  src={provider.image || 'https://via.placeholder.com/330x380/F3F3F3/666666?text=Truck'}
                  alt={provider.name}
                  className={styles.productImage}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://via.placeholder.com/330x380/F3F3F3/666666?text=Truck';
                  }}
                />
              </Link>
            </div>

            <div className={styles.contentWrapper}>
              <div className={styles.titleWrapper}>
                {provider.publishedByAdmin ? (
                  <h3 className={styles.productTitle}>{provider.name}</h3>
                ) : (
                  <Link
                    className={styles.productTitleLink}
                    href={provider.userId ? `/${locale}/users/${provider.userId}` : `/${locale}`}
                  >
                    <h3 className={styles.productTitle}>{provider.name}</h3>
                  </Link>
                )}
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
                      {getLocationLabel(
                        (provider.destination ?? provider.placeOfBusiness) ?? '',
                        locale === 'ar' ? 'ar' : 'en'
                      )}
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
                        onClick={() => {
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
      
      {/* Right Arrow */}
      <button
        className={`${styles.carouselArrow} ${styles.carouselArrowRight}`}
        onClick={scrollRight}
        aria-label={t('scrollRight')}
      >
        ‹
      </button>

      {/* Remove the old carouselControls div since we now have side arrows */}
    </section>
  );
};

export default CarouselSection;