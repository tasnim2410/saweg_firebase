'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import styles from './register.module.css';

export default function RegisterPage() {
  const t = useTranslations('register');
  const locale = useLocale();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    city: '',
    userType: 'customer',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        console.error('Registration request failed');
        return;
      }

      setSubmitted(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (submitted) {
    return (
      <div className={styles.container}>
        <div className={styles.successCard}>
          <div className={styles.successIconWrapper}>
            <CheckCircle className={styles.successIcon} />
          </div>
          <h2 className={styles.successTitle}>
            {t('success')}
          </h2>
          <Link
            href={`/${locale}`}
            className={styles.backButton}
          >
            {locale === 'ar' ? 'العودة للصفحة الرئيسية' : 'Back to Home'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentWrapper}>
        {/* Back Button */}
        <Link
          href={`/${locale}`}
          className={styles.backLink}
        >
          <ArrowLeft className={styles.backIcon} />
          <span>{locale === 'ar' ? 'العودة' : 'Back'}</span>
        </Link>

        {/* Registration Form */}
        <div className={styles.formCard}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.logoWrapper}>
              <Image
                src="/images/logo.png"
                alt="Saweg logo"
                width={200}
                height={80}
                className={styles.logoImage}
                priority
              />
            </div>
            <h1 className={styles.title}>
              {t('title')}
            </h1>
            <p className={styles.description}>
              {t('description')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className={styles.form}>
            <div>
              <label className={styles.label}>
                {t('fullName')}
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className={styles.input}
                placeholder={locale === 'ar' ? 'أدخل اسمك الكامل' : 'Enter your full name'}
              />
            </div>

            <div>
              <label className={styles.label}>
                {t('email')} <span style={{fontWeight: 'normal', fontSize: '0.85em', color: '#666'}}>({locale === 'ar' ? 'اختياري' : 'Optional'})</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={styles.input}
                placeholder={locale === 'ar' ? 'example@email.com' : 'example@email.com'}
              />
            </div>

            <div>
              <label className={styles.label}>
                {t('phone')}
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className={styles.input}
                placeholder={locale === 'ar' ? '+218 XX XXX XXX' : '+218 XXX XXX XXX'}
              />
            </div>

            <div>
              <label className={styles.label}>
                {t('city')}
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                className={styles.input}
                placeholder={locale === 'ar' ? 'أدخل مدينتك' : 'Enter your city'}
              />
            </div>

            <div>
              <label className={styles.label}>
                {t('userType')}
              </label>
              <select
                name="userType"
                value={formData.userType}
                onChange={handleChange}
                required
                className={styles.input}
              >
                <option value="customer">{t('customer')}</option>
                <option value="partner">{t('partner')}</option>
              </select>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
            >
              {t('submit')}
            </button>
          </form>
        </div>

        {/* Download Buttons */}
        {/* <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">
            {locale === 'ar' ? 'أو حمل التطبيق الآن' : 'Or download the app now'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="flex items-center justify-center gap-3 px-6 py-4 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              <div className="text-start">
                <div className="text-xs">{locale === 'ar' ? 'حمل من' : 'Download on'}</div>
                <div className="text-lg font-semibold">App Store</div>
              </div>
            </button>

            <button className="flex items-center justify-center gap-3 px-6 py-4 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
              </svg>
              <div className="text-start">
                <div className="text-xs">{locale === 'ar' ? 'حمل من' : 'Get it on'}</div>
                <div className="text-lg font-semibold">Google Play</div>
              </div>
            </button>
          </div>
        </div> */}
      </div>
    </div>
  );
}
