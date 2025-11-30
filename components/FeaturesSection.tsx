
'use client';

import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import Image from 'next/image';
import styles from './FeaturesSection.module.css';

export default function FeaturesSection() {
  const t = useTranslations('features');
  const locale = useLocale();
  const isRTL = locale === 'ar';

  return (
    <section id="features" className={styles.section}>
      <div className={styles.container}>
        <h2 className={styles.title}>
          {t('title')}
        </h2>
        <p className={styles.subtitle}>
          {t('subtitle')}
        </p>
        <div className={styles.divider} />

        <div className={styles.mapWrapper}>
          {/* Map background */}
          <div className={styles.mapContainer}>
            <Image
              src="/images/map.png"
              alt={isRTL ? 'خريطة العالم' : 'World map'}
              fill
              className={styles.mapImage}
            />

            {/* Text card overlay */}
            <div className={styles.textCardOverlay}>
              <div
                className={`${styles.textCard} ${
                  isRTL ? styles.textCardRtl : styles.textCardLtr
                }`}
              >
                <p>{t('description')}</p>
              </div>
            </div>

            {/* Truck image with forward movement that disappears */}
            <motion.div
              initial={{ x: '30%' }}
              whileInView={{
                x: ['30%', '-190%', '100%', '30%']
              }}
              transition={{ 
                duration: 6,
                times: [0, 0.4, 0.1, 1],
                ease: 'easeInOut'
              }}
              viewport={{ once: true, amount: 0.1 }}
              className={styles.truckContainer}
            >
              <Image
                src="/images/truck.png"
                alt={isRTL ? 'شاحنة سواق' : 'Saweg truck'}
                width={600}
                height={300}
                className={styles.truckImage}
                priority
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
