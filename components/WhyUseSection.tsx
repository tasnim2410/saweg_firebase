'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import styles from './WhyUseSection.module.css';
import whyImg2 from '@/public/images/why-this-app2.jpg';

type AuthMeResponse = {
  ok: boolean;
  user: null | {
    type: 'SHIPPER' | 'MERCHANT' | 'ADMIN' | null;
    isAdmin?: boolean;
  };
};

type UsersStatsResponse = {
  ok: boolean;
  merchantCount: number;
  shipperCount: number;
};

export default function WhyUseSection() {
  const t = useTranslations('whyUse');
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const [authUser, setAuthUser] = useState<AuthMeResponse['user']>(null);
  const [stats, setStats] = useState<UsersStatsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const data = (await res.json().catch(() => null)) as AuthMeResponse | null;
        if (cancelled) return;
        setAuthUser(data?.user ?? null);
      } catch {
        if (cancelled) return;
        setAuthUser(null);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/api/stats/users', { cache: 'no-store' });
        const data = (await res.json().catch(() => null)) as UsersStatsResponse | null;
        if (cancelled) return;
        setStats(data && typeof data.merchantCount === 'number' && typeof data.shipperCount === 'number' ? data : null);
      } catch {
        if (cancelled) return;
        setStats(null);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const isLoggedIn = Boolean(authUser);

  const features = [
    { title: t('feature1Title'), desc: t('feature1Desc') },
    { title: t('feature2Title'), desc: t('feature2Desc') },
    { title: t('feature3Title'), desc: t('feature3Desc') },
    { title: t('feature4Title'), desc: t('feature4Desc') },
  ];

  const userStatsLabel = useMemo(() => {
    const base = t('stats.users');
    const m = base.match(/\d+/);
    const baseline = m ? Number(m[0]) : 0;
    const live = stats?.merchantCount ?? 0;
    const nextValue = baseline + live;
    return m ? base.replace(/\d+/, String(nextValue)) : base;
  }, [stats?.merchantCount, t]);

  const deliveriesStatsLabel = useMemo(() => {
    const base = t('stats.deliveries');
    const m = base.match(/\d+/);
    const baseline = m ? Number(m[0]) : 0;
    const live = stats?.shipperCount ?? 0;
    const nextValue = baseline + live;
    return m ? base.replace(/\d+/, String(nextValue)) : base;
  }, [stats?.shipperCount, t]);

  return (
    <section id="partners" className={styles.section}>
      <div className={styles.container}>
        {/* Top heading and description */}
        <div className={`${styles.headerContainer} ${isRTL ? styles.headerContainerRtl : styles.headerContainerLtr}`}>
          <h2 className={styles.headerTitle}>
            {t('merchantTitle')}
          </h2>
          <p className={styles.headerDesc}>
            {t('merchantDesc')}
          </p>
        </div>

        <div className={styles.contentWrapper}>
          <div
            className={`${styles.flexContainer} ${
              isRTL ? styles.flexContainerReverse : ''
            }`}
          >
            {/* Truck Image */}
            <div className={styles.imageSide}>
              <div className={styles.imageContainer}>
                {/* <Image
                  src="/images/why-this-app1.jpg"
                  alt={isRTL ? 'شاحنة سواق 1' : 'Saweg truck 1'}
                  fill
                  className={`${styles.truckAnimate} ${styles.truck1}`}
                /> */}
                <Image
                  src={whyImg2}
                  alt={isRTL ? 'شاحنة سواق 2' : 'Saweg truck 2'}
                  fill
                  className={`${styles.truckAnimate} ${styles.truck2}`}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Features List + Register Button */}
            <div className={`${styles.featuresSide} ${isRTL ? styles.featuresSideRtl : styles.featuresSideLtr}`}>
              <div>
                <h3 className={styles.featuresTitle}>
                  {t('title')}
                </h3>
                <div className={styles.featuresList}>
                  {features.map((feature, index) => (
                    <div key={index} className={styles.featureItem}>
                      <h4 className={styles.featureItemTitle}>
                        {feature.title}
                      </h4>
                      <p className={styles.featureItemDesc}>
                        {feature.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.tagline}>{t('tagline')}</div>

              {!isLoggedIn ? (
                <div>
                  <Link
                    href={`/${locale}/register`}
                    className={styles.registerButton}
                  >
                    {t('registerNow')}
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Stats Boxes - Now only 2 boxes */}
        <div className={styles.statsGrid}>
          <div className={styles.statBox}>
            <div className={styles.statIconWrapper}>
              <svg className={styles.statIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div className={styles.statLabel}>{userStatsLabel}</div>
          </div>
          
          <div className={styles.statBox}>
            <div className={styles.statIconWrapper}>
              <svg className={styles.statIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="3" width="15" height="13"></rect>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                <circle cx="18.5" cy="18.5" r="2.5"></circle>
              </svg>
            </div>
            <div className={styles.statLabel}>{deliveriesStatsLabel}</div>
          </div>
        </div>
      </div>
    </section>
  );
}