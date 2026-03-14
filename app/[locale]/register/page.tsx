'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Truck, Package } from 'lucide-react';
import styles from './register.module.css';
import logoImg from '@/public/images/logo.png';

export default function RegisterPage() {
  const t = useTranslations('register');
  const locale = useLocale();
  const isRTL = locale === 'ar';

  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentWrapper}>
        {/* Back Button */}
        <Link
          href={`/${locale}`}
          className={styles.backLink}
        >
          {isRTL ? (
            <>
              <span>{'العودة'}</span>
              <ArrowLeft className={styles.backIcon} style={{ transform: 'rotate(180deg)' }} />
            </>
          ) : (
            <>
              <ArrowLeft className={styles.backIcon} />
              <span>{'Back'}</span>
            </>
          )}
        </Link>

        {/* Registration Type Selection */}
        <div className={styles.formCard}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.logoWrapper}>
              <Image
                src={logoImg}
                alt="Saweg logo"
                width={200}
                height={80}
                className={styles.logoImage}
                priority
              />
            </div>
            <h1 className={styles.title}>
              {t('chooseTitle')}
            </h1>
            {/* <p className={styles.description}>
              {t('chooseDescription')}
            </p> */}
          </div>

          <div className={styles.form}>
            <div className={styles.choiceButtonsContainer}>
              <Link
                href={`/${locale}/register/shipper`}
                className={styles.choiceButton}
              >
                <Truck className={styles.buttonIcon} />
                <span>{t('registerAsShipper')}</span>
              </Link>
              <Link
                href={`/${locale}/register/merchant`}
                className={styles.choiceButton}
                style={{ marginLeft: '0.75rem' }}
              >
                <Package className={styles.buttonIcon} />
                <span> {t('registerAsMerchant')} </span>
              </Link>
            </div>
            
            {/* Divider with "or" text */}
            {/* <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '1rem 0'
            }}>
              <div style={{
                flex: 1,
                height: '1px',
                backgroundColor: '#e5e7eb'
              }}></div>
              <span style={{
                padding: '0 1rem',
                color: '#6b7280',
                fontSize: '0.875rem',
                fontWeight: 500
              }}>
                {locale === 'ar' ? 'أو' : 'or'}
              </span>
              <div style={{
                flex: 1,
                height: '1px',
                backgroundColor: '#e5e7eb'
              }}></div>
            </div> */}
            
            {/* Google Play Button (Centered below) */}
            {/* <div style={{
              display: 'flex',
              justifyContent: 'center'
            }}>
              <Link
                href={`/${locale}/register`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  padding: '1rem 1.5rem',
                  backgroundColor: 'black',
                  color: 'white',
                  borderRadius: '0.75rem',
                  transition: 'background-color 0.3s',
                  textDecoration: 'none',
                  width: '100%',
                  maxWidth: '20rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#1f2937';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'black';
                }}
              >
                <svg style={{ width: '2rem', height: '2rem' }} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                </svg>
                <div style={{ textAlign: 'start' }}>
                  <div style={{ fontSize: '0.75rem' }}>
                    {locale === 'ar' ? 'حمل من' : 'Get it on'}
                  </div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                    Google Play
                  </div>
                </div>
              </Link>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}