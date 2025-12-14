'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import styles from '../register.module.css';

type RegistrationRole = 'shipper' | 'merchant';

type Props = {
  role: RegistrationRole;
};

export default function RegistrationForm({ role }: Props) {
  const t = useTranslations('register');
  const locale = useLocale();

  const [submitted, setSubmitted] = useState(false);
  const [truckImage, setTruckImage] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    city: '',
    carKind: '',
    maxCharge: '',
    maxChargeUnit: 'kg',
    placeOfBusiness: '',
    trucksNeeded: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = new FormData();
    payload.append('fullName', formData.fullName);
    payload.append('email', formData.email);
    payload.append('phone', formData.phone);
    payload.append('city', formData.city);
    payload.append('role', role);

    if (role === 'shipper') {
      payload.append('carKind', formData.carKind);
      payload.append('maxCharge', formData.maxCharge);
      payload.append('maxChargeUnit', formData.maxChargeUnit);
      if (truckImage) payload.append('truckImage', truckImage);
    }

    if (role === 'merchant') {
      payload.append('placeOfBusiness', formData.placeOfBusiness);
      payload.append('trucksNeeded', formData.trucksNeeded);
    }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        body: payload,
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTruckImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setTruckImage(file);
  };

  if (submitted) {
    return (
      <div className={styles.container}>
        <div className={styles.successCard}>
          <div className={styles.successIconWrapper}>
            <CheckCircle className={styles.successIcon} />
          </div>
          <h2 className={styles.successTitle}>{t('success')}</h2>
          <Link href={`/${locale}`} className={styles.backButton}>
            {locale === 'ar' ? 'العودة للصفحة الرئيسية' : 'Back to Home'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentWrapper}>
        <Link href={`/${locale}/register`} className={styles.backLink}>
          <ArrowLeft className={styles.backIcon} />
          <span>{locale === 'ar' ? 'العودة' : 'Back'}</span>
        </Link>

        <div className={styles.formCard}>
          <div className={styles.header}>
            <h1 className={styles.title}>
              {role === 'shipper' ? t('shipperTitle') : t('merchantTitle')}
            </h1>
            <p className={styles.description}>
              {role === 'shipper' ? t('shipperDescription') : t('merchantDescription')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div>
              <label className={styles.label}>{t('fullName')}</label>
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
                {t('email')}{' '}
                <span style={{ fontWeight: 'normal', fontSize: '0.85em', color: '#666' }}>
                  ({locale === 'ar' ? 'اختياري' : 'Optional'})
                </span>
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
              <label className={styles.label}>{t('phone')}</label>
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
              <label className={styles.label}>{t('city')}</label>
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

            {role === 'shipper' && (
              <>
                <div>
                  <label className={styles.label}>{t('carKind')}</label>
                  <input
                    type="text"
                    name="carKind"
                    value={formData.carKind}
                    onChange={handleChange}
                    required
                    className={styles.input}
                    placeholder={
                      locale === 'ar'
                        ? 'مثال: شاحنة صغيرة / شاحنة كبيرة'
                        : 'e.g. Small truck / Big truck'
                    }
                  />
                </div>

                <div>
                  <label className={styles.label}>{t('maxCharge')}</label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <input
                      type="number"
                      name="maxCharge"
                      value={formData.maxCharge}
                      onChange={handleChange}
                      required
                      min={0}
                      step="any"
                      className={styles.input}
                      placeholder={locale === 'ar' ? 'مثال: 1000' : 'e.g. 1000'}
                      style={{ flex: 1 }}
                    />
                    <select
                      name="maxChargeUnit"
                      value={formData.maxChargeUnit}
                      onChange={(e) =>
                        setFormData({ ...formData, maxChargeUnit: e.target.value })
                      }
                      className={styles.input}
                      style={{ width: '7rem' }}
                    >
                      <option value="kg">kg</option>
                      <option value="ton">ton</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={styles.label}>{t('truckImage')}</label>
                  <input
                    type="file"
                    name="truckImage"
                    accept="image/*"
                    onChange={handleTruckImageChange}
                    className={styles.input}
                  />
                </div>
              </>
            )}

            {role === 'merchant' && (
              <>
                <div>
                  <label className={styles.label}>{t('placeOfBusiness')}</label>
                  <input
                    type="text"
                    name="placeOfBusiness"
                    value={formData.placeOfBusiness}
                    onChange={handleChange}
                    required
                    className={styles.input}
                    placeholder={locale === 'ar' ? 'مثال: سوق/محل/شركة - المدينة' : 'e.g. Shop/Company - City'}
                  />
                </div>

                <div>
                  <label className={styles.label}>{t('trucksNeeded')}</label>
                  <input
                    type="text"
                    name="trucksNeeded"
                    value={formData.trucksNeeded}
                    onChange={handleChange}
                    required
                    className={styles.input}
                    placeholder={
                      locale === 'ar'
                        ? 'مثال: شاحنة صغيرة، براد، قلاب...'
                        : 'e.g. small truck, refrigerated, dump truck...'
                    }
                  />
                </div>
              </>
            )}

            <button type="submit" className={styles.submitButton}>
              {t('submit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
