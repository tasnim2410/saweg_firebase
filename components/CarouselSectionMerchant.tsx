'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import styles from './CarouselSection.module.css';
import { getLocationLabel } from '@/lib/locations';
import { normalizePhoneNumber } from '@/lib/phone';

type MerchantGoodsPost = {
  id: number;
  name?: string;
  phone?: string;
  startingPoint: string;
  destination: string;
  goodsType: string;
  goodsWeight: number;
  goodsWeightUnit: string;
  loadingDate: string | Date;
  vehicleTypeDesired: string;
  image: string | null;
  description: string | null;
  userId: string;
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

  const endpoint = '/api/merchant-goods-posts';
  const addHref = `/${locale}/dashboard/add-merchant-goods-post`;
  const title = locale === 'ar' ? 'طلبات التجّار' : 'Merchants requests';

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
                style={{
                  backgroundImage: post.image ? `url(${post.image})` : undefined,
                }}
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
              </div>

              <div className={styles.contentWrapper}>
                <div className={styles.titleWrapper}>
                  <Link className={styles.productTitleLink} href={`/${locale}/users/${post.userId}`}>
                    <h3 className={styles.productTitle}>{merchantName}</h3>
                  </Link>
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
