'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './my-profile.module.css';

type User = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  type?: string | null;
};

export default function MyProfilePage() {
  const t = useTranslations('profile');
  const locale = useLocale();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (cancelled) return;

        const user: User | null = data?.user ?? null;
        if (!user) {
          router.push(`/${locale}/login`);
          router.refresh();
          return;
        }

        setFullName(user.fullName ?? '');
        setEmail(user.email ?? '');
        setPhone(user.phone ?? '');
      } catch {
        if (cancelled) return;
        setError(t('loadFailed'));
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [locale, router, t]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!fullName.trim()) {
      setError(t('fullNameRequired'));
      return;
    }

    if (!email.trim() && !phone.trim()) {
      setError(t('emailOrPhoneRequired'));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          phone,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        const code = data?.error;
        if (code === 'DUPLICATE_EMAIL') {
          setError(t('duplicateEmail'));
        } else if (code === 'DUPLICATE_PHONE') {
          setError(t('duplicatePhone'));
        } else if (code === 'DUPLICATE_IDENTIFIER') {
          setError(t('duplicateIdentifier'));
        } else if (code === 'FULL_NAME_REQUIRED') {
          setError(t('fullNameRequired'));
        } else if (code === 'EMAIL_OR_PHONE_REQUIRED') {
          setError(t('emailOrPhoneRequired'));
        } else {
          setError(t('saveFailed'));
        }
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch {
      setError(t('saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t('title')}</h1>
        </div>

        {loading ? (
          <div className={styles.loading}>{t('loading')}</div>
        ) : (
          <form className={styles.form} onSubmit={onSubmit}>
            <div className={styles.row}>
              <label className={styles.label}>{t('fullName')}</label>
              <input className={styles.input} value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>

            <div className={styles.row}>
              <label className={styles.label}>{t('email')}</label>
              <input className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className={styles.row}>
              <label className={styles.label}>{t('phone')}</label>
              <input className={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            {error ? <div className={styles.error}>{error}</div> : null}
            {success ? <div className={styles.success}>{t('saved')}</div> : null}

            <button className={styles.button} type="submit" disabled={saving}>
              {saving ? t('saving') : t('save')}
            </button>

            <div className={styles.footer}>
              <Link className={styles.link} href={`/${locale}`}>
                {t('back')}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
