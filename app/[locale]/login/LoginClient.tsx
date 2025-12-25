'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import styles from './auth.module.css';

export default function LoginClient() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getErrorMessage = (code: string) => {
    switch (code) {
      case 'IDENTIFIER_REQUIRED':
        return t('errors.emailOrPhoneRequired');
      case 'PASSWORD_REQUIRED':
        return t('errors.passwordRequired');
      case 'INVALID_CREDENTIALS':
        return t('invalidCredentials');
      default:
        return t('somethingWentWrong');
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError(t('errors.emailOrPhoneRequired'));
      return;
    }
    if (!password) {
      setError(t('errors.passwordRequired'));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setError(getErrorMessage(data?.error ?? 'UNKNOWN'));
        setLoading(false);
        return;
      }

      router.push(next || `/${locale}`);
      router.refresh();
    } catch {
      setError(t('somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t('loginTitle')}</h1>
        </div>

        <form className={styles.form} onSubmit={onSubmit}>
          <div>
            <label className={styles.label}>{t('emailOrPhone')}</label>
            <input
              className={styles.input}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label className={styles.label}>{t('password')}</label>
            <input
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </div>

          {error ? <div className={styles.error}>{error}</div> : null}

          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? t('loading') : t('loginButton')}
          </button>
        </form>

        <div className={styles.linkRow}>
          <span>{t('noAccount')}</span>
          <Link className={styles.link} href={`/${locale}/signup`}>
            {t('signupTitle')}
          </Link>
        </div>
      </div>
    </div>
  );
}
