'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import styles from './WhyUseSection.module.css';

export default function WhyUseSection() {
  const t = useTranslations('whyUse');
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const features = [
    { title: t('feature1Title'), desc: t('feature1Desc') },
    { title: t('feature2Title'), desc: t('feature2Desc') },
    { title: t('feature3Title'), desc: t('feature3Desc') },
    { title: t('feature4Title'), desc: t('feature4Desc') },

  ];

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
                <Image
                  src="/images/why-this-app1.png"
                  alt={isRTL ? 'شاحنة سواق 1' : 'Saweg truck 1'}
                  fill
                  className={`${styles.truckAnimate} ${styles.truck1}`}
                  priority
                />
                <Image
                  src="/images/why-this-app2.jpg"
                  alt={isRTL ? 'شاحنة سواق 2' : 'Saweg truck 2'}
                  fill
                  className={`${styles.truckAnimate} ${styles.truck2}`}
                  priority
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
              <div className={styles.tagline}>
                لأن بضاعتك تستحق الأفضل دائمًا 
              </div>

              {/* Register Button */}
              <div>
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
            <div className={styles.statLabel}>{t('stats.users')}</div>
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
            <div className={styles.statLabel}>{t('stats.deliveries')}</div>
          </div>
        </div>
      </div>
    </section>
  );
}