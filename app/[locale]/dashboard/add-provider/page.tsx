'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './add-provider.module.css';
import { getLocationOptions } from '@/lib/locations';

export default function AddProviderPage() {
  const t = useTranslations('providerForm');
  const locale = useLocale();
  const router = useRouter();

  const locationOptions = getLocationOptions(locale === 'ar' ? 'ar' : 'en');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [active, setActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        const type = data?.user?.type;
        const admin = Boolean(data?.user?.isAdmin);
        setIsAdmin(admin);
        if (!admin && type === 'MERCHANT') {
          router.push(`/${locale}`);
          router.refresh();
          return;
        }
        const fullName = data?.user?.fullName;
        if (typeof fullName === 'string') setName(fullName);
        const userPhone = data?.user?.phone;
        if (typeof userPhone === 'string') setPhone(userPhone);
      } catch {
        if (cancelled) return;
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!location.trim() || !phone.trim()) {
      setError('Missing required fields');
      return;
    }

    const payload = new FormData();
    if (isAdmin && name.trim()) payload.append('name', name.trim());
    payload.append('destination', destination);
    payload.append('placeOfBusiness', destination);
    payload.append('description', description);
    payload.append('location', location);
    payload.append('phone', phone);
    payload.append('active', active ? 'true' : 'false');
    if (imageFile) payload.append('image', imageFile);

    setSubmitting(true);
    try {
      const res = await fetch('/api/providers', {
        method: 'POST',
        body: payload,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || 'Failed to publish');
        return;
      }

      setSuccess(true);
      router.push(`/${locale}`);
      router.refresh();
    } catch {
      setError('Failed to publish');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t('title')}</h1>
        </div>

        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.row}>
            <label className={styles.label}>{t('name')}</label>
            <input
              className={styles.input}
              value={name}
              disabled={!isAdmin}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>{t('destination')}</label>
            <select
              className={styles.input}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            >
              <option value="" />
              {locationOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.row}>
            <label className={styles.label}>{t('description')}</label>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>{t('location')}</label>
            <select
              className={styles.input}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            >
              <option value="" />
              {locationOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.row}>
            <label className={styles.label}>{t('phone')}</label>
            <input className={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>{t('image')}</label>
            <input
              className={styles.file}
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span>{t('active')}</span>
          </label>

          {error ? <div className={styles.error}>{error}</div> : null}
          {success ? <div className={styles.success}>{t('success')}</div> : null}

          <button className={styles.button} type="submit" disabled={submitting}>
            {submitting ? t('submitting') : t('submit')}
          </button>

          <div className={styles.footer}>
            <Link className={styles.link} href={`/${locale}`}>
              Back
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
