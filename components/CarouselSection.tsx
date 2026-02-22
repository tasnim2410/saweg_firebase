'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import styles from './CarouselSection.module.css';
import { normalizeVehicleType, VEHICLE_TYPE_CONFIG } from '@/lib/vehicleTypes';
import { getLocationLabel } from '@/lib/locations';
import { getLocationCoordinates, calculateDistance } from '@/lib/distance';
import type { MaxChargeValue } from '@/app/[locale]/providers/MaxChargeFilter';
import { MAX_CHARGE_OPTIONS } from '@/app/[locale]/providers/MaxChargeFilter';
import type { DistanceSource, DistanceValue } from '@/app/[locale]/providers/DistanceFilter';
import { Share2, Phone, MapPin, Truck, Plus, MessageCircle } from 'lucide-react';

interface Provider {
  id: number;
  userId?: string;
  name: string;           // used as title
  location: string;       // used as current location
  phone: string;          // phoneNumber
  image: string | null;   // path to uploaded image
  active: boolean;
  lastLocationUpdateAt?: string | Date;
  createdAt?: string | Date;
  description?: string | null;
  destination?: string | null;
  placeOfBusiness?: string | null;
  publishedByAdmin?: boolean;
  user?: {
    carKind?: string | null;
    maxCharge?: string | null;
    maxChargeUnit?: string | null;
  } | null;
}

interface CarouselSectionProps {
  vehicleTypeFilter?: string | null;
  maxChargeFilter?: MaxChargeValue[] | null;
  destinationsFilter?: string[] | null;
  distanceFilter?: {
    distance: DistanceValue | null;
    source: DistanceSource;
    city: string | null;
    location: { lat: number; lon: number } | null;
    classifiedCity: string | null;
  } | null;
}

const CarouselSection: React.FC<CarouselSectionProps> = ({
  vehicleTypeFilter,
  maxChargeFilter,
  destinationsFilter,
  distanceFilter,
}) => {

  const carouselRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('carousel');
  const locale = useLocale();

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [canAdd, setCanAdd] = useState(false);
  const [openShareForId, setOpenShareForId] = useState<number | null>(null);
  const [openCallForId, setOpenCallForId] = useState<number | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<number, boolean>>({});
  const [distanceFilteredProviders, setDistanceFilteredProviders] = useState<Provider[]>([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const sharePopoverRef = useRef<HTMLDivElement | null>(null);
  const callPopoverRef = useRef<HTMLDivElement | null>(null);

  const endpoint = '/api/providers';
  const addHref = `/${locale}/dashboard/add-provider`;
  const callsEndpointFor = (id: number) => `/api/providers/${id}/calls`;
  const title = locale === 'ar' ? 'عروض السوّاقين' : 'Shippers offers';

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
    const shareTitle = locale === 'ar' ? 'Saweg' : 'Saweg';

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
        if (cancelled) return;
        setError(false);
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error('Failed to fetch');
        const data: Provider[] = await res.json();
        if (cancelled) return;
        setProviders(data);
      } catch (err) {
        console.error('Error loading providers:', err);
        if (cancelled) return;
        setError(true);
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };

    const onOnline = () => {
      if (cancelled) return;
      setLoading(true);
      setError(false);
      void fetchProviders();
    };

    loadAuth();
    fetchProviders();

    window.addEventListener('online', onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
    };
  }, []);

  const MAX_ITEMS = 10;
  const MAX_DESCRIPTION_CHARS = 55;

  useEffect(() => {
    const applyDistanceFilter = async () => {
      if (!distanceFilter || !distanceFilter.distance || distanceFilter.distance === 'any') {
        setDistanceFilteredProviders(providers);
        return;
      }

      const { distance, source, city, location, classifiedCity } = distanceFilter;

      let referenceCoords: { lat: number; lon: number } | null = null;

      if (source === 'selected-city' && city) {
        const coords = await getLocationCoordinates(city);
        if (coords) referenceCoords = coords;
      } else if (source === 'current-location' && location) {
        referenceCoords = location;
      }

      if (!referenceCoords) {
        const refCity = source === 'current-location' ? classifiedCity : city;
        const refCityLower = refCity?.toLowerCase().trim();

        if (!refCityLower || distance !== 'same-city') {
          setDistanceFilteredProviders(providers);
          return;
        }

        const filteredByCity = providers.filter((p) => {
          const providerLocation = p.location?.toLowerCase().trim();
          if (!providerLocation) return false;
          return (
            providerLocation === refCityLower ||
            providerLocation.includes(refCityLower) ||
            refCityLower.includes(providerLocation)
          );
        });

        setDistanceFilteredProviders(filteredByCity);
        return;
      }

      const filtered = await Promise.all(
        providers.map(async (p) => {
          if (distance === 'same-city') {
            const refCity = source === 'current-location' ? classifiedCity : city;
            const refCityLower = refCity?.toLowerCase().trim();
            const providerLocation = p.location?.toLowerCase().trim();

            if (
              refCityLower &&
              providerLocation &&
              (providerLocation === refCityLower ||
                providerLocation.includes(refCityLower) ||
                refCityLower.includes(providerLocation))
            ) {
              return p;
            }
          }

          const providerCoords = await getLocationCoordinates(p.location);
          if (!providerCoords) {
            return null;
          }

          const distKm = calculateDistance(referenceCoords!, providerCoords);

          switch (distance) {
            case 'same-city':
              return distKm <= 10 ? p : null;
            case 'nearby-30':
              return distKm <= 30 ? p : null;
            case 'nearby-50':
              return distKm <= 50 ? p : null;
            case 'nearby-100':
              return distKm <= 100 ? p : null;
            case 'nearby-150':
              return distKm <= 150 ? p : null;
            case 'nearby-200':
              return distKm <= 200 ? p : null;
            default:
              return p;
          }
        })
      );

      setDistanceFilteredProviders(filtered.filter((p): p is Provider => p !== null));
    };

    applyDistanceFilter();
  }, [providers, distanceFilter]);

  const baseList = distanceFilteredProviders.length > 0 || (distanceFilter && distanceFilter.distance)
    ? distanceFilteredProviders
    : providers;

  const filteredProviders = baseList.filter((p) => {
    if (vehicleTypeFilter) {
      const providerCarKind = p.user?.carKind;
      if (!providerCarKind) return false;
      const normalizedProvider = normalizeVehicleType(providerCarKind);
      if (normalizedProvider !== vehicleTypeFilter) return false;
    }

    if (maxChargeFilter && maxChargeFilter.length > 0) {
      const providerMaxCharge = p.user?.maxCharge;
      if (!providerMaxCharge) return false;

      const chargeValue = parseFloat(providerMaxCharge);
      if (Number.isNaN(chargeValue)) return false;

      const unit = p.user?.maxChargeUnit?.toLowerCase() || 'kg';
      const chargeInKg = unit.includes('ton') ? chargeValue * 1000 : chargeValue;

      const matchesAnyRange = maxChargeFilter.some((optionValue) => {
        const option = MAX_CHARGE_OPTIONS.find((o) => o.value === optionValue);
        if (!option) return false;
        return chargeInKg >= option.min && chargeInKg < option.max;
      });

      if (!matchesAnyRange) return false;
    }

    if (destinationsFilter && destinationsFilter.length > 0) {
      const providerDestination = (p.destination ?? p.placeOfBusiness)?.toLowerCase().trim();
      if (!providerDestination) return false;

      const matchesDestination = destinationsFilter.some((destValue) => {
        const v = destValue.toLowerCase();
        return (
          providerDestination === v ||
          providerDestination.includes(v) ||
          v.includes(providerDestination)
        );
      });

      if (!matchesDestination) return false;
    }

    return true;
  });

  const hasMore = filteredProviders.length > MAX_ITEMS;
  const visibleProviders = hasMore ? filteredProviders.slice(0, MAX_ITEMS) : filteredProviders;
  const seeMoreOffersHref = `/${locale}/providers`;
  const seeMoreOffersLabel = locale === 'ar' ? 'عرض المزيد' : 'See more';

  const checkScrollButtons = () => {
    if (!carouselRef.current) return;
    const carousel = carouselRef.current;
    const items = Array.from(carousel.children) as HTMLElement[];
    if (items.length === 0) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const containerRect = carousel.getBoundingClientRect();
    let minLeft = Number.POSITIVE_INFINITY;
    let maxRight = Number.NEGATIVE_INFINITY;

    for (const item of items) {
      const rect = item.getBoundingClientRect();
      minLeft = Math.min(minLeft, rect.left);
      maxRight = Math.max(maxRight, rect.right);
    }

    const threshold = 2;
    setCanScrollLeft(minLeft < containerRect.left - threshold);
    setCanScrollRight(maxRight > containerRect.right + threshold);
  };

  useEffect(() => {
    checkScrollButtons();
    const carousel = carouselRef.current;
    if (carousel) {
      carousel.addEventListener('scroll', checkScrollButtons);
      window.addEventListener('resize', checkScrollButtons);
      return () => {
        carousel.removeEventListener('scroll', checkScrollButtons);
        window.removeEventListener('resize', checkScrollButtons);
      };
    }
  }, [visibleProviders]);

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

  const toWhatsAppHref = (phoneNumber: string) => {
    const normalized = phoneNumber.replace(/[^\d]/g, '');
    return `https://wa.me/${normalized}`;
  };

  const handleCallClick = (providerId: number) => {
    setOpenCallForId((prev) => (prev === providerId ? null : providerId));
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

  const timeAgoLabelFromMs = (ms: number) => {
    if (!Number.isFinite(ms)) return '';
    const diffMs = Date.now() - ms;
    if (!Number.isFinite(diffMs) || diffMs < 0) return '';

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const isAr = locale === 'ar';

    if (minutes < 1) return isAr ? 'الآن' : 'now';
    if (minutes < 60) return isAr ? `منذ ${minutes} دقيقة` : `${minutes}m ago`;
    if (hours < 24) return isAr ? `منذ ${hours} ساعة` : `${hours}h ago`;
    if (days < 7) return isAr ? `منذ ${days} يوم` : `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return isAr ? `منذ ${weeks} أسبوع` : `${weeks}w ago`;
    const months = Math.floor(days / 30);
    return isAr ? `منذ ${months} شهر` : `${months}mo ago`;
  };

  // Loading state
  if (loading) {
    return (
      <section className={styles.carouselContainer}>
        <div className={styles.carouselTopBar}>
          <h2 className={styles.carouselTitle}>{title}</h2>
          <div className={styles.topBarActions}>
            <Link className={styles.viewAllButton} href={seeMoreOffersHref}>
              {seeMoreOffersLabel}
            </Link>
            {canAdd ? (
              <Link className={styles.addButton} href={addHref}>
                {t('addProvider')}
              </Link>
            ) : null}
          </div>
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
          <div className={styles.topBarActions}>
            <Link className={styles.viewAllButton} href={seeMoreOffersHref}>
              {seeMoreOffersLabel}
            </Link>
            {canAdd ? (
              <Link className={styles.addButton} href={addHref}>
                {t('addProvider')}
              </Link>
            ) : null}
          </div>
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
        <div className={styles.topBarActions}>
          <Link className={styles.viewAllButton} href={seeMoreOffersHref}>
            {seeMoreOffersLabel}
          </Link>
          {canAdd ? (
            <Link className={styles.addButton} href={addHref}>
              {t('addProvider')}
            </Link>
          ) : null}
        </div>
      </div>

      <div className={styles.carouselWrapper}>
        {canScrollLeft && (
          <button
            className={`${styles.carouselArrow} ${styles.carouselArrowLeft}`}
            onClick={scrollLeft}
            aria-label={t('scrollLeft')}
          >
            {locale === 'ar' ? '›' : '‹'}
          </button>
        )}

        <div className={styles.carousel} ref={carouselRef}>
          {visibleProviders.map((provider) => {
            const lastUpdateMs = provider.lastLocationUpdateAt
              ? new Date(provider.lastLocationUpdateAt as any).getTime()
              : NaN;
            const createdAtMs = provider.createdAt ? new Date(provider.createdAt as any).getTime() : NaN;
            /*
            const isStale = Number.isFinite(lastUpdateMs)
              ? Date.now() - lastUpdateMs > 24 * 60 * 60 * 1000
              : false;
            const isActive = provider.active && !isStale;
            */
            const isActive = true; // Always active (ignores DB value)
            const statusClass = isActive ? styles.statusActive : styles.statusInactive;

            const timeAgo = timeAgoLabelFromMs(createdAtMs);

            const description = (provider.description ?? '').trim();
            const descriptionShort =
              description.length > MAX_DESCRIPTION_CHARS
                ? `${description.slice(0, MAX_DESCRIPTION_CHARS)}...`
                : description;

            const imageSrc = provider.image || '';
            const hasImage = !!provider.image;
            const isImageBroken = brokenImages[provider.id];

            return (
              <div key={provider.id} className={styles.carouselItem}>
                <div className={styles.imageContainer}>
                  <Link
                    href={`/${locale}/providers/${provider.id}`}
                    aria-label={provider.name}
                    className={styles.imageLink}
                  >
                    {hasImage ? (
                      !isImageBroken ? (
                        <Image
                          src={imageSrc}
                          alt={provider.name}
                          fill
                          sizes="(max-width: 480px) 210px, (max-width: 768px) 250px, 280px"
                          className={styles.productImage}
                          loading="lazy"
                          onError={() => {
                            setBrokenImages((prev) => (prev[provider.id] ? prev : { ...prev, [provider.id]: true }));
                          }}
                        />
                      ) : (
                        <div className={styles.imageError}>
                          {locale === 'ar' ? 'فشل تحميل الصورة' : 'Failed to upload'}
                        </div>
                      )
                    ) : null}
                  </Link>

                  {timeAgo ? <div className={styles.timeBadge}>{timeAgo}</div> : null}

                  <button
                    type="button"
                    className={styles.shareButton}
                    onClick={() => void handleShare(provider)}
                    aria-label={t('share') || 'Share'}
                    title={t('share') || 'Share'}
                  >
                    <Share2 size={16} aria-hidden="true" />
                  </button>

                  {openShareForId === provider.id && (
                    <div
                      ref={sharePopoverRef}
                      className={styles.shareMenu}
                      role="menu"
                      aria-label="Share options"
                    >
                      {/* Share menu items */}
                    </div>
                  )}
                </div>

                <div className={styles.contentWrapper}>
                  <div className={styles.metaContainer}>
                    {description ? (
                      <div className={styles.descriptionContainer}>
                        <Link
                          href={`/${locale}/providers/${provider.id}`}
                          className={styles.descriptionLink}
                          aria-label={provider.name}
                        >
                          <p className={`${styles.description} ${styles.descriptionClickable}`}>
                            {descriptionShort}
                          </p>
                        </Link>
                      </div>
                    ) : null}

                    {provider.location ? (
                      <div className={styles.locationContainer}>
                        <MapPin size={14} className={styles.locationIcon} />
                        <span className={styles.locationText}>
                          {getLocationLabel(provider.location, locale === 'ar' ? 'ar' : 'en')}
                        </span>
                        <span
                          className={`${styles.statusDot} ${statusClass}`}
                          title={
                            isActive
                              ? locale === 'ar'
                                ? 'نشط'
                                : 'Active'
                              : locale === 'ar'
                                ? 'غير نشط'
                                : 'Inactive'
                          }
                        />
                      </div>
                    ) : null}

                    {(provider.destination ?? provider.placeOfBusiness) ? (
                      <div className={styles.destinationContainer}>
                        <Truck size={14} className={styles.destinationIcon} />
                        <span className={styles.destinationText}>
                          {t('destinationPrefix')}{' '}
                          {getLocationLabel(
                            (provider.destination ?? provider.placeOfBusiness) ?? '',
                            locale === 'ar' ? 'ar' : 'en'
                          )}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className={styles.actionContainer}>
                    <button
                      type="button"
                      className={`${styles.callButton} ${statusClass}`}
                      onClick={() => handleCallClick(provider.id)}
                      aria-label={t('call') || 'Call'}
                      title={t('call') || 'Call'}
                    >
                      <Phone size={16} className={styles.callIcon} />
                      <span className={styles.callText}>{t('call') || 'Call'}</span>
                    </button>

                    {openCallForId === provider.id && (
                      <div
                        ref={callPopoverRef}
                        className={styles.callMenu}
                        role="menu"
                        aria-label="Call options"
                      >
                        <a
                          href={toTelHref(provider.phone)}
                          onClick={() => trackCall(provider.id)}
                          className={styles.callMenuItem}
                          role="menuitem"
                        >
                          <Phone size={14} />
                          <span>{locale === 'ar' ? 'اتصال' : 'Phone Call'}</span>
                        </a>
                        <a
                          href={toWhatsAppHref(provider.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.callMenuItem}
                          role="menuitem"
                        >
                          <MessageCircle size={14} />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {hasMore ? (
            <Link
              href={seeMoreOffersHref}
              className={`${styles.carouselItem} ${styles.seeMoreCard}`}
              aria-label={seeMoreOffersLabel}
            >
              <div className={styles.seeMoreInner}>
                <div className={styles.seeMoreIconWrap} aria-hidden="true">
                  <Plus size={28} />
                </div>
                <div className={styles.seeMoreText}>{seeMoreOffersLabel}</div>
              </div>
            </Link>
          ) : null}
        </div>

        {canScrollRight && (
          <button
            className={`${styles.carouselArrow} ${styles.carouselArrowRight}`}
            onClick={scrollRight}
            aria-label={t('scrollRight')}
          >
            {locale === 'ar' ? '‹' : '›'}
          </button>
        )}
      </div>
    </section>
  );
};

export default CarouselSection;
