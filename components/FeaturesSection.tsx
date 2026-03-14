
'use client';

import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import Image from 'next/image';
import styles from './FeaturesSection.module.css';
import truckImg from '@/public/images/truck.png';

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
      </div>

      <div className={styles.mapWrapper}>
        {/* Map background */}
          <div className={styles.mapContainer}>
            {/* <Image
              src="/images/map.png"
              alt={isRTL ? 'خريطة العالم' : 'World map'}
              fill
              className={styles.mapImage}
            /> */}

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
                x: ['30%', '-250%', '100%', '30%']
              }}
              transition={{ 
                duration: 6,
                times: [0, 0.4, 0.15, 1],
                ease: 'easeInOut'
              }}
              viewport={{ once: true, amount: 0.1 }}
              className={styles.truckContainer}
            >
              <Image
                src={truckImg}
                alt={isRTL ? 'شاحنة سواق' : 'Saweg truck'}
                width={600}
                height={300}
                className={styles.truckImage}
                sizes="(max-width: 768px) 300px, 600px"
                loading="lazy"
              />
            </motion.div>
          </div>
        </div>
    </section>
  );
}
