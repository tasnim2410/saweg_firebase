'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import styles from './CarouselSection.module.css';
import { getLocationLabel } from '@/lib/locations';

type MerchantGoodsPost = {
  id: number;
  name: string;
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [nameEdits, setNameEdits] = useState<Record<number, string>>({});
  const [savingNameId, setSavingNameId] = useState<number | null>(null);

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
        const admin = Boolean(data?.user?.isAdmin);
        setIsAdmin(admin);
        setCanAdd(admin || type === 'MERCHANT' || type === 'ADMIN');
      } catch {
        if (cancelled) return;
        setIsAdmin(false);
        setCanAdd(false);
      }
    };

    const fetchPosts = async () => {
      try {
        const res = await fetch(endpoint, { cache: 'no-store' });
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

  const displayNameFor = (post: MerchantGoodsPost) => {
    const fromPost = (post.name || '').trim();
    if (fromPost) return fromPost;
    const fromUser = (post.user?.fullName || '').trim();
    return fromUser || (locale === 'ar' ? 'تاجر' : 'Merchant');
  };

  const saveName = async (postId: number) => {
    if (!isAdmin) return;

    const nextName = (nameEdits[postId] ?? '').trim();
    const existing = posts.find((p) => p.id === postId);
    const existingName = existing ? (existing.name || '').trim() : '';
    if (!existing) return;
    if (!nextName || nextName === existingName) return;

    setSavingNameId(postId);
    try {
      const res = await fetch(`/api/merchant-goods-posts/${postId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: nextName }),
      });

      if (!res.ok) {
        return;
      }

      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, name: nextName } : p)));
    } catch {
      return;
    } finally {
      setSavingNameId(null);
    }
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
          const displayName = displayNameFor(post);
          const effectiveName = nameEdits[post.id] ?? displayName;
          const showLogoPlaceholder = !post.image;
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
                  alt={displayName}
                  className={styles.productImage}
                  style={
                    showLogoPlaceholder
                      ? {
                          filter: 'grayscale(1) contrast(1.2)',
                        }
                      : undefined
                  }
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/logo.png';
                  }}
                />
              </div>

              <div className={styles.contentWrapper}>
                <div className={styles.titleWrapper}>
                  {isAdmin ? (
                    <input
                      className={styles.productTitle}
                      value={effectiveName}
                      disabled={savingNameId === post.id}
                      onChange={(e) => setNameEdits((prev) => ({ ...prev, [post.id]: e.target.value }))}
                      onBlur={() => void saveName(post.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        width: '100%',
                        textAlign: 'center',
                        outline: 'none',
                      }}
                    />
                  ) : (
                    <Link className={styles.productTitleLink} href={`/${locale}/users/${post.userId}`}>
                      <h3 className={styles.productTitle}>{displayName}</h3>
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
