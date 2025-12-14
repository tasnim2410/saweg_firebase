'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { Apple } from 'lucide-react';
import Image from 'next/image';
import styles from './HeroSection.module.css';

const HERO_IMAGES = ['/images/hero1.jpg', '/images/hero2.png', '/images/hero3.jpg'];

export default function HeroSection() {
  const t = useTranslations('hero');
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section id="hero" className={styles.section}>
      <div className={styles.heroContainer}>
        {HERO_IMAGES.map((src, index) => (
          <Image
            key={src}
            src={src}
            alt={isRTL ? 'شاحنة على الطريق' : 'Truck on the road'}
            fill
            priority={index === 0}
            className={`${styles.heroImage} ${
              index === currentImageIndex ? styles.visible : styles.hidden
            }`}
          />
        ))}
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

            {/* Register Now Button */}
            <div className={styles.buttonsContainer}>
              <Link
                href={`/${locale}/register`}
                className={styles.registerButton}
              >
                {t('registerNow')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}