'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import styles from './CarouselSection.module.css';
import { getLocationLabel } from '@/lib/locations';
import { normalizePhoneNumber } from '@/lib/phone';
import { Share2 } from 'lucide-react';

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

const CarouselSectionMerchant: React.FC = () => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('carousel');
  const locale = useLocale();

  const [posts, setPosts] = useState<MerchantGoodsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [canAdd, setCanAdd] = useState(false);
  const [openShareForId, setOpenShareForId] = useState<number | null>(null);
  const [copiedForId, setCopiedForId] = useState<number | null>(null);
  const sharePopoverRef = useRef<HTMLDivElement | null>(null);

  const endpoint = '/api/merchant-goods-posts';
  const addHref = `/${locale}/dashboard/add-merchant-goods-post`;
  const title = locale === 'ar' ? 'طلبات التجّار' : 'Merchants requests';

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
    const shareTitle =
      (typeof post.name === 'string' && post.name.trim()) ||
      post.user?.fullName ||
      (locale === 'ar' ? 'تاجر' : 'Merchant');

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
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error('Failed to fetch');
        const data: MerchantGoodsPost[] = await res.json();
        setPosts(data);
      } catch (err) {
        console.error('Error loading merchant goods posts:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadAuth();
    fetchPosts();

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

  const formatPhoneForDisplay = (phoneNumber: string) => {
    const trimmed = (phoneNumber || '').trim();
    if (trimmed.endsWith('+') && !trimmed.startsWith('+')) {
      return `+${trimmed.slice(0, -1)}`;
    }
    return trimmed;
  };

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

  if (error || posts.length === 0) {
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
          {error ? t('error') || 'حدث خطأ أثناء تحميل العروض' : t('noProviders') || 'لا توجد عروض متاحة حالياً'}
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

      <button
        className={`${styles.carouselArrow} ${styles.carouselArrowLeft}`}
        onClick={scrollLeft}
        aria-label={t('scrollLeft')}
      >
        ›
      </button>

      <div className={styles.carousel} ref={carouselRef}>
        {posts.map((post) => {
          const merchantName =
            (typeof post.name === 'string' && post.name.trim()) ||
            post.user?.fullName ||
            (locale === 'ar' ? 'تاجر' : 'Merchant');

          const phoneCandidate =
            (typeof post.phone === 'string' && post.phone.trim()) ||
            (typeof post.user?.phone === 'string' && post.user.phone.trim()) ||
            '';

          const normalizedPhone = phoneCandidate ? normalizePhoneNumber(phoneCandidate) : null;
          const phoneNumber = normalizedPhone && normalizedPhone.ok ? normalizedPhone.e164 : phoneCandidate;

          return (
            <div key={post.id} className={styles.carouselItem}>
              <div
                className={styles.imageContainer}
              >
                <div className={styles.shareWrapper} ref={openShareForId === post.id ? sharePopoverRef : undefined}>
                  <button
                    type="button"
                    className={styles.shareButton}
                    onClick={() => void handleShare(post)}
                    aria-label={t('share') || 'Share'}
                    title={t('share') || 'Share'}
                  >
                    <Share2 size={18} aria-hidden="true" />
                  </button>

                  {openShareForId === post.id ? (
                    <div className={styles.shareMenu} role="menu" aria-label={t('share') || 'Share'}>
                      {(() => {
                        const shareUrl = buildShareUrlForPost(post.id);
                        const shareTitle = merchantName;
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
                                  setCopiedForId(post.id);
                                  window.setTimeout(() => setCopiedForId(null), 1200);
                                }
                              }}
                            >
                              {copiedForId === post.id ? (t('copied') || 'Copied!') : (t('copyLink') || 'Copy link')}
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  ) : null}
                </div>

                <Link
                  href={`/${locale}/merchant-goods-posts/${post.id}`}
                  aria-label={merchantName}
                  style={{ display: 'block' }}
                >
                  <img
                    src={post.image || '/images/logo.png'}
                    alt={merchantName}
                    className={styles.productImage}
                    style={!post.image ? { filter: 'grayscale(100%)' } : undefined}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/logo.png';
                      (e.target as HTMLImageElement).style.filter = 'grayscale(100%)';
                    }}
                  />
                </Link>
              </div>

              <div className={styles.contentWrapper}>
                <div className={styles.titleWrapper}>
                  {post.publishedByAdmin ? (
                    <h3 className={styles.productTitle}>{merchantName}</h3>
                  ) : (
                    <Link className={styles.productTitleLink} href={`/${locale}/users/${post.userId}`}>
                      <h3 className={styles.productTitle}>{merchantName}</h3>
                    </Link>
                  )}
                </div>

                <div className={styles.placeOfBusinessContainer}>
                  <p className={styles.placeOfBusiness}>
                    {(locale === 'ar' ? 'المسار:' : 'Route:')}{' '}
                    {getLocationLabel(post.startingPoint, locale === 'ar' ? 'ar' : 'en')} →{' '}
                    {getLocationLabel(post.destination, locale === 'ar' ? 'ar' : 'en')}
                  </p>
                </div>

                <div className={styles.descriptionContainer}>
                  <p className={styles.description}>
                    {(locale === 'ar' ? 'نوع البضاعة:' : 'Goods:')}{' '}
                    <span className={styles.descriptionLine}>{post.goodsType}</span>
                  </p>
                  <p className={styles.description}>
                    {(locale === 'ar' ? 'الوزن:' : 'Weight:')}{' '}
                    <span className={styles.descriptionLine}>
                      {post.goodsWeight} {post.goodsWeightUnit}
                    </span>
                  </p>
                  {post.budget ? (
                    <p className={styles.description}>
                      {(locale === 'ar' ? 'الميزانية:' : 'Budget:')}{' '}
                      <span className={styles.descriptionLine}>
                        {post.budget}
                        {post.budgetCurrency ? ` ${post.budgetCurrency}` : ''}
                      </span>
                    </p>
                  ) : null}
                  <p className={styles.description}>
                    {(locale === 'ar' ? 'تاريخ التحميل:' : 'Loading date:')}{' '}
                    <span className={styles.descriptionLine}>{formatDate(post.loadingDate)}</span>
                  </p>
                  <p className={styles.description}>
                    {(locale === 'ar' ? 'نوع المركبة المطلوبة:' : 'Vehicle needed:')}{' '}
                    <span className={styles.descriptionLine}>{post.vehicleTypeDesired}</span>
                  </p>
                </div>

                {post.description ? (
                  <div className={styles.descriptionContainer}>
                    <p className={styles.description}>
                      {post.description.split('\n').map((line, index) => (
                        <span key={index} className={styles.descriptionLine}>
                          {line}
                        </span>
                      ))}
                    </p>
                  </div>
                ) : null}

                <div className={styles.phoneContainer}>
                  {phoneNumber ? (
                    <a
                      className={styles.phoneButton}
                      href={toTelHref(phoneNumber)}
                      aria-label={`Call: ${phoneNumber}`}
                      title={t('call') || 'Call'}
                    >
                      <span className={styles.phoneNumberIcon}>📞</span>
                      <span dir="ltr" className={`${styles.phoneNumberText} ${styles.phoneNumberLtr}`}>
                        {formatPhoneForDisplay(phoneNumber)}
                      </span>
                    </a>
                  ) : (
                    <span className={`${styles.phoneButton} ${styles.phoneButtonDisabled}`}>-
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        className={`${styles.carouselArrow} ${styles.carouselArrowRight}`}
        onClick={scrollRight}
        aria-label={t('scrollRight')}
      >
        ‹
      </button>
    </section>
  );
};

export default CarouselSectionMerchant;
