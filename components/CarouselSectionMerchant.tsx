'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import styles from './CarouselSection.module.css';
import { getLocationLabel } from '@/lib/locations';
import { normalizeVehicleType } from '@/lib/vehicleTypes';
import { normalizePhoneNumber } from '@/lib/phone';
import { Share2, Phone, MapPin, Truck, Plus, MessageCircle } from 'lucide-react';

type MerchantGoodsPost = {
  id: number;
  name?: string;
  phone?: string;
  startingPoint: string;
  destination: string;
  goodsType: string;
  goodsWeight: number;
  goodsWeightUnit: string;
  budget?: number | null;
  budgetCurrency?: string | null;
  loadingDate: string | Date;
  vehicleTypeDesired: string;
  image: string | null;
  description: string | null;
  userId: string;
  publishedByAdmin?: boolean;
  user?: {
    fullName?: string;
    phone?: string | null;
  };
  createdAt?: string | Date;
};

interface CarouselSectionMerchantProps {
  vehicleTypeFilter?: string | null;
}

const CarouselSectionMerchant: React.FC<CarouselSectionMerchantProps> = ({ vehicleTypeFilter }) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('carousel');
  const locale = useLocale();

  const [posts, setPosts] = useState<MerchantGoodsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [canAdd, setCanAdd] = useState(false);
  const [openShareForId, setOpenShareForId] = useState<number | null>(null);
  const [openCallForId, setOpenCallForId] = useState<number | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<number, boolean>>({});
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const sharePopoverRef = useRef<HTMLDivElement | null>(null);
  const callPopoverRef = useRef<HTMLDivElement | null>(null);

  const endpoint = '/api/merchant-goods-posts';
  const addHref = `/${locale}/dashboard/add-merchant-goods-post`;
  const title = locale === 'ar' ? 'عروض التجار' : 'Merchants requests';

  const buildShareUrlForPost = (postId: number) => {
    if (typeof window === 'undefined') return `/${locale}/merchant-goods-posts/${postId}`;
    return `${window.location.origin}/${locale}/merchant-goods-posts/${postId}`;
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

  const handleShare = async (post: MerchantGoodsPost) => {
    const shareUrl = buildShareUrlForPost(post.id);
    const shareTitle = locale === 'ar' ? 'Saweg' : 'Saweg';

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: shareTitle,
          text: post.description || undefined,
          url: shareUrl,
        });
        return;
      } catch {
        // fall back to popover
      }
    }

    setOpenShareForId((prev) => (prev === post.id ? null : post.id));
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

  useEffect(() => {
    if (openCallForId === null) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (callPopoverRef.current && !callPopoverRef.current.contains(target)) {
        setOpenCallForId(null);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenCallForId(null);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openCallForId]);

  const MAX_DESCRIPTION_CHARS = 55;

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

  useEffect(() => {
    let cancelled = false;

    const loadAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        const type = data?.user?.type;
        const isAdmin = Boolean(data?.user?.isAdmin);
        setCanAdd(isAdmin || type === 'MERCHANT' || type === 'ADMIN');
      } catch {
        if (cancelled) return;
        setCanAdd(false);
      }
    };

    const fetchPosts = async () => {
      try {
        if (cancelled) return;
        setError(false);
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error('Failed to fetch');
        const data: MerchantGoodsPost[] = await res.json();
        if (cancelled) return;
        setPosts(data);
      } catch (err) {
        console.error('Error loading merchant goods posts:', err);
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
      void fetchPosts();
    };

    loadAuth();
    fetchPosts();

    window.addEventListener('online', onOnline);

    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
    };
  }, []);

  const MAX_ITEMS = 10;

  // Filter posts by vehicle type if filter is active
  const filteredPosts = vehicleTypeFilter
    ? posts.filter((p) => {
        const postVehicleType = p.vehicleTypeDesired;
        if (!postVehicleType) return false;
        const normalizedPost = normalizeVehicleType(postVehicleType);
        return normalizedPost === vehicleTypeFilter;
      })
    : posts;

  const hasMore = filteredPosts.length > MAX_ITEMS;
  const visiblePosts = hasMore ? filteredPosts.slice(0, MAX_ITEMS) : filteredPosts;
  const seeMoreHref = `/${locale}/merchant-goods-posts`;
  const seeMoreLabel = locale === 'ar' ? 'عرض المزيد' : 'See all';


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
  }, [visiblePosts]);
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

  const formatDate = (d: string | Date) => {
    const date = new Date(d as any);
    if (Number.isNaN(date.getTime())) return '';
    try {
      return date.toLocaleDateString(locale === 'ar' ? 'ar' : 'en');
    } catch {
      return date.toISOString().slice(0, 10);
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

  const handleCallClick = (postId: number) => {
    setOpenCallForId((prev) => (prev === postId ? null : postId));
  };

  if (loading) {
    return (
      <section className={styles.carouselContainer}>
        <div className={styles.carouselTopBar}>
          <h2 className={styles.carouselTitle}>{title}</h2>
          <div className={styles.topBarActions}>
            <Link className={styles.viewAllButton} href={seeMoreHref}>
              {seeMoreLabel}
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

  if (error || posts.length === 0) {
    return (
      <section className={styles.carouselContainer}>
        <div className={styles.carouselTopBar}>
          <h2 className={styles.carouselTitle}>{title}</h2>
          <div className={styles.topBarActions}>
            <Link className={styles.viewAllButton} href={seeMoreHref}>
              {seeMoreLabel}
            </Link>
            {canAdd ? (
              <Link className={styles.addButton} href={addHref}>
                {t('addProvider')}
              </Link>
            ) : null}
          </div>
        </div>
        <div className={styles.emptyState}>
          {error ? t('error') || 'حدث خطأ أثناء تحميل العروض' : t('noProviders') || 'لا توجد عروض متاحة حالياً'}
        </div>
      </section>
    );
  }

  return (
    <section className={styles.carouselContainer}>
      <div className={styles.carouselTopBar}>
        <h2 className={styles.carouselTitle}>{title}</h2>
        <div className={styles.topBarActions}>
          <Link className={styles.viewAllButton} href={seeMoreHref}>
            {seeMoreLabel}
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
          {visiblePosts.map((post) => {
            const merchantName =
              (typeof post.name === 'string' && post.name.trim()) ||
              post.user?.fullName ||
              (locale === 'ar' ? 'تاجر' : 'Merchant');

            const imageSrc = post.image || '';
            const hasImage = !!post.image;
            const isImageBroken = brokenImages[post.id];

            const phoneCandidate =
              (typeof post.phone === 'string' && post.phone.trim()) ||
              (typeof post.user?.phone === 'string' && post.user.phone.trim()) ||
              '';

            const normalizedPhone = phoneCandidate ? normalizePhoneNumber(phoneCandidate) : null;
            const phoneNumber = normalizedPhone && normalizedPhone.ok ? normalizedPhone.e164 : phoneCandidate;

            const createdAtMs = post.createdAt ? new Date(post.createdAt as any).getTime() : NaN;
            const isRecent = Number.isFinite(createdAtMs)
              ? Date.now() - createdAtMs <= 24 * 60 * 60 * 1000
              : false;

            const statusClass = isRecent ? styles.statusActive : styles.statusInactive;

            const timeAgo = timeAgoLabelFromMs(createdAtMs);

            const description = (post.description ?? '').trim();
            const descriptionShort =
              description.length > MAX_DESCRIPTION_CHARS
                ? `${description.slice(0, MAX_DESCRIPTION_CHARS)}...`
                : description;

            return (
              <div key={post.id} className={styles.carouselItem}>
                <div className={styles.imageContainer}>
                  <Link
                    href={`/${locale}/merchant-goods-posts/${post.id}`}
                    aria-label={merchantName}
                    className={styles.imageLink}
                  >
                  {hasImage ? (
                    !isImageBroken ? (
                      <Image
                        src={imageSrc}
                        alt={merchantName}
                        fill
                        sizes="(max-width: 480px) 210px, (max-width: 768px) 250px, 280px"
                        className={styles.productImage}
                        loading="lazy"
                        onError={() => {
                          setBrokenImages((prev) => (prev[post.id] ? prev : { ...prev, [post.id]: true }));
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
                    onClick={() => void handleShare(post)}
                    aria-label={t('share') || 'Share'}
                    title={t('share') || 'Share'}
                  >
                    <Share2 size={16} aria-hidden="true" />
                  </button>

                  {openShareForId === post.id && (
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
                          href={`/${locale}/merchant-goods-posts/${post.id}`}
                          className={styles.descriptionLink}
                          aria-label={merchantName}
                        >
                          <p className={`${styles.description} ${styles.descriptionClickable}`}>
                            {descriptionShort}
                          </p>
                        </Link>
                      </div>
                    ) : null}

                    <div className={styles.locationContainer}>
                      <MapPin size={14} className={styles.locationIcon} />
                      <span className={styles.locationText}>
                        {getLocationLabel(post.startingPoint || '-', locale === 'ar' ? 'ar' : 'en')}
                      </span>
                      <span className={`${styles.statusDot} ${statusClass}`} />
                    </div>

                    <div className={styles.destinationContainer}>
                      <Truck size={14} className={styles.destinationIcon} />
                      <span className={styles.destinationText}>
                        {getLocationLabel(post.destination || '-', locale === 'ar' ? 'ar' : 'en')}
                      </span>
                    </div>
                  </div>

                  <div className={styles.actionContainer}>
                    {phoneNumber ? (
                      <>
                        <button
                          type="button"
                          className={`${styles.callButton} ${statusClass}`}
                          onClick={() => handleCallClick(post.id)}
                          aria-label={t('call') || 'Call'}
                          title={t('call') || 'Call'}
                        >
                          <Phone size={16} className={styles.callIcon} />
                          <span className={styles.callText}>{t('call') || 'Call'}</span>
                        </button>

                        {openCallForId === post.id && (
                          <div
                            ref={callPopoverRef}
                            className={styles.callMenu}
                            role="menu"
                            aria-label="Call options"
                          >
                            <a
                              href={toTelHref(phoneNumber)}
                              className={styles.callMenuItem}
                              role="menuitem"
                            >
                              <Phone size={14} />
                              <span>{locale === 'ar' ? 'اتصال' : 'Phone Call'}</span>
                            </a>
                            <a
                              href={toWhatsAppHref(phoneNumber)}
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
                      </>
                    ) : (
                      <span className={`${styles.callButton} ${styles.statusInactive}`}>-</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {hasMore ? (
            <Link
              href={seeMoreHref}
              className={`${styles.carouselItem} ${styles.seeMoreCard}`}
              aria-label={seeMoreLabel}
            >
              <div className={styles.seeMoreInner}>
                <div className={styles.seeMoreIconWrap} aria-hidden="true">
                  <Plus size={28} />
                </div>
                <div className={styles.seeMoreText}>{seeMoreLabel}</div>
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

export default CarouselSectionMerchant;
