'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import styles from './auth.module.css';

export default function SignupPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getErrorMessage = (code: string) => {
    switch (code) {
      case 'FULL_NAME_REQUIRED':
        return t('errors.fullNameRequired');
      case 'EMAIL_OR_PHONE_REQUIRED':
        return t('errors.emailOrPhoneRequired');
      case 'PASSWORD_TOO_SHORT':
        return t('errors.passwordTooShort');
      case 'USER_ALREADY_EXISTS':
        return t('errors.userAlreadyExists');
      default:
        return t('somethingWentWrong');
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const fullNameTrimmed = fullName.trim();
    const emailTrimmed = email.trim();
    const phoneTrimmed = phone.trim();
    if (!fullNameTrimmed) {
      setError(t('errors.fullNameRequired'));
      return;
    }
    if (!emailTrimmed && !phoneTrimmed) {
      setError(t('errors.emailOrPhoneRequired'));
      return;
    }
    if (password.length < 6) {
      setError(t('errors.passwordTooShort'));
      return;
    }
    if (password !== repeatPassword) {
      setError(t('errors.passwordsDoNotMatch'));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          fullName: fullNameTrimmed,
          email: emailTrimmed ? emailTrimmed : null,
          phone: phoneTrimmed ? phoneTrimmed : null,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setError(getErrorMessage(data?.error ?? 'UNKNOWN'));
        setLoading(false);
        return;
      }

      router.push(`/${locale}`);
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
          <h1 className={styles.title}>{t('signupTitle')}</h1>
        </div>

        <form className={styles.form} onSubmit={onSubmit}>
          <div>
            <label className={styles.label}>{t('fullName')}</label>
            <input
              className={styles.input}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </div>

          <div>
            <label className={styles.label}>{t('email')}</label>
            <input
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
            />
          </div>

          <div>
            <label className={styles.label}>{t('phone')}</label>
            <input
              className={styles.input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </div>

          <div>
            <label className={styles.label}>{t('password')}</label>
            <input
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className={styles.label}>{t('repeatPassword')}</label>
            <input
              className={styles.input}
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
            />
          </div>

          {error ? <div className={styles.error}>{error}</div> : null}

          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? t('loading') : t('signupButton')}
          </button>
        </form>

        <div className={styles.linkRow}>
          <span>{t('haveAccount')}</span>
          <Link className={styles.link} href={`/${locale}/login`}>
            {t('loginTitle')}
          </Link>
        </div>
      </div>
    </div>
  );
}
