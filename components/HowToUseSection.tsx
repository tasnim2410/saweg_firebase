'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import styles from './HowToUseSection.module.css';

export default function HowToUseSection() {
  const t = useTranslations('howToUse');
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const steps = [
    { number: 1, text: t('step1') },
    { number: 2, text: t('step2') },
    { number: 3, text: t('step3') },
    { number: 4, text: t('step4') },
    { number: 5, text: t('step5') },
    { number: 6, text: t('step6') },
    { number: 7, text: t('step7') },
  ];

  return (
    <section id="how-to-use" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {t('title')}
          </h2>
          <p className={styles.description}>
            {t('description')}
          </p>
        </div>

        {/* Top store buttons */}
        <div className={styles.storeButtons}>
          <Link
            href={`/${locale}/register`}
            className={styles.storeButton}
          >
            <svg className={styles.buttonIcon} viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            <div className={styles.buttonTextContainer}>
              <div className={styles.buttonSmallText}>{locale === 'ar' ? 'حمل من' : 'Download on'}</div>
              <div className={styles.buttonLargeText}>App Store</div>
            </div>
          </Link>

          <Link
            href={`/${locale}/register`}
            className={styles.storeButton}
          >
            <svg className={styles.buttonIcon} viewBox="0 0 24 24" fill="currentColor">
              <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
            </svg>
            <div className={styles.buttonTextContainer}>
              <div className={styles.buttonSmallText}>{locale === 'ar' ? 'حمل من' : 'Get it on'}</div>
              <div className={styles.buttonLargeText}>Google Play</div>
            </div>
          </Link>
        </div>

        <div
          className={styles.contentFlex}
        >
          {/* Steps - Text content - Now comes FIRST in DOM for Arabic, SECOND for English */}
          <div className={`${styles.stepsContainer} ${isRTL ? styles.stepsContainerRtl : styles.stepsContainerLtr}`}>
            {steps.map((step) => (
              <div
                key={step.number}
                className={styles.stepItem}
              >
                {/* Number circle - will automatically be on right in Arabic due to flex-row-reverse */}
                <div className={styles.stepNumber}>
                  {step.number}
                </div>
                <p className={styles.stepText}>
                  {step.text}
                </p>
              </div>
            ))}
          </div>

          {/* Phone Mockup with app preview - Now comes SECOND in DOM for Arabic, FIRST for English */}
          <div className={styles.phoneContainer}>
            <div className={styles.phoneFrameWrapper}>
              {/* Phone Frame */}
              <div className={styles.phoneFrame}></div>
              
              {/* Screen */}
              <div className={styles.screen}>
                <div className={styles.screenContent}>
                  <Image
                    src="/images/app-preview.png"
                    alt={locale === 'ar' ? 'معاينة تطبيق سواق' : 'Saweg app preview'}
                    width={240}
                    height={480}
                    className={styles.appPreviewImage}
                    priority
                  />
                </div>
              </div>
              
              {/* Notch */}
              <div className={styles.notch}></div>
              
              {/* Home Indicator */}
              <div className={styles.homeIndicator}></div>
              
              {/* Volume Buttons */}
              <div className={styles.volumeButton1}></div>
              <div className={styles.volumeButton2}></div>
              
              {/* Power Button */}
              <div className={styles.powerButton}></div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}