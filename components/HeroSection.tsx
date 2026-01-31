'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import styles from './HeroSection.module.css';

const HERO_IMAGES = ['/images/hero1.jpg', '/images/hero2.png', '/images/hero3.jpg'];

type AuthMeResponse = {
  ok: boolean;
  user: null | {
    type: 'SHIPPER' | 'MERCHANT' | 'ADMIN' | null;
    isAdmin?: boolean;
  };
};

export default function HeroSection() {
  const t = useTranslations('hero');
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const [authUser, setAuthUser] = useState<AuthMeResponse['user']>(null);

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

  const isLoggedIn = Boolean(authUser);
  const isAdmin = Boolean(authUser?.isAdmin || authUser?.type === 'ADMIN');
  const userType = authUser?.type ?? null;

  const addProviderHref = `/${locale}/dashboard/add-provider`;
  const addMerchantHref = `/${locale}/dashboard/add-merchant-goods-post`;

  return (
    <section id="hero" className={styles.section}>
      <div className={styles.heroContainer}>
        <Image
          src={HERO_IMAGES[0]}
          alt={isRTL ? 'شاحنة على الطريق' : 'Truck on the road'}
          fill
          priority
          sizes="100vw"
          quality={60}
          className={styles.heroImage}
        />
        <div className={styles.overlay} />

        <div className={styles.contentWrapper}>
          <div className={styles.textContainer}>
            <p className={styles.welcomeText}>
              {t('welcome')}
            </p>
            <h1 className={styles.heading}>
              {t('slogan')}
            </h1>
            <p className={styles.description}>
              {t('description')}
            </p>
            {/* <p className={styles.registerText}>
              {t('registerNow')}
            </p> */}

            {/* Primary CTA */}
            <div className={styles.buttonsContainer}>
              {!isLoggedIn ? (
                <Link href={`/${locale}/register`} className={styles.registerButton}>
                  {t('registerNow')}
                </Link>
              ) : isAdmin ? (
                <>
                  <Link href={addProviderHref} className={styles.registerButton}>
                    {t('addShipperOffer')}
                  </Link>
                  <Link href={addMerchantHref} className={styles.registerButton}>
                    {t('addMerchantOffer')}
                  </Link>
                </>
              ) : userType === 'SHIPPER' ? (
                <Link href={addProviderHref} className={styles.registerButton}>
                  {t('addPost')}
                </Link>
              ) : (
                <Link href={addMerchantHref} className={styles.registerButton}>
                  {t('addPost')}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}