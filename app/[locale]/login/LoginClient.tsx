'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';
import styles from './auth.module.css';

export default function LoginClient() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') || search.get('callbackUrl');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [toasts, setToasts] = useState<
    Array<{
      id: string;
      title: string;
      message: string;
    }>
  >([]);

  const pushToast = (toast: { title: string; message: string }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [{ id, ...toast }, ...prev]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((tItem) => tItem.id !== id));
    }, 5000);
  };

  const titleFor = (kind: 'form' | 'auth' | 'network') => {
    if (locale === 'ar') {
      if (kind === 'form') return 'خطأ في النموذج';
      if (kind === 'auth') return 'خطأ في تسجيل الدخول';
      return 'خطأ في الاتصال';
    }
    if (kind === 'form') return 'Form error';
    if (kind === 'auth') return 'Login error';
    return 'Network error';
  };

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

    if (!identifier.trim()) {
      pushToast({ title: titleFor('form'), message: t('errors.emailOrPhoneRequired') });
      return;
    }
    if (!password) {
      pushToast({ title: titleFor('form'), message: t('errors.passwordRequired') });
      return;
    }

    setLoading(true);

    try {
      // Step 1: Resolve identifier to email (handles phone number logins)
      let email = identifier.trim();
      if (!email.includes('@')) {
        const resolveRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ identifier }),
        });
        const resolveData = await resolveRes.json();
        if (!resolveRes.ok || !resolveData?.email) {
          pushToast({ title: titleFor('auth'), message: getErrorMessage('INVALID_CREDENTIALS') });
          setLoading(false);
          return;
        }
        email = resolveData.email;
      }

      // Step 2: Firebase sign in
      let idToken: string;
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        idToken = await cred.user.getIdToken();
      } catch (firebaseErr: any) {
        const code = firebaseErr?.code;
        if (
          code === 'auth/invalid-credential' ||
          code === 'auth/wrong-password' ||
          code === 'auth/user-not-found'
        ) {
          pushToast({ title: titleFor('auth'), message: getErrorMessage('INVALID_CREDENTIALS') });
        } else {
          pushToast({ title: titleFor('auth'), message: t('somethingWentWrong') });
        }
        setLoading(false);
        return;
      }

      // Step 3: Exchange Firebase idToken for a server session cookie
      const sessionRes = await fetch('/api/create-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok || !sessionData?.ok) {
        pushToast({ title: titleFor('auth'), message: getErrorMessage(sessionData?.error ?? 'UNKNOWN') });
        setLoading(false);
        return;
      }

      router.push(next || `/${locale}`);
      router.refresh();
    } catch {
      pushToast({ title: titleFor('network'), message: t('somethingWentWrong') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {toasts.length ? (
        <div className={styles.toastContainer} aria-live="polite" aria-atomic="true">
          {toasts.map((toast) => (
            <div key={toast.id} className={`${styles.toast} ${styles.toastError}`} role="status">
              <div>
                <div className={styles.toastTitle}>{toast.title}</div>
                <div className={styles.toastMessage}>{toast.message}</div>
              </div>
              <button
                type="button"
                className={styles.toastClose}
                aria-label="Close"
                onClick={() => setToasts((prev) => prev.filter((tItem) => tItem.id !== toast.id))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}
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
        <div className={styles.linkRow}>
          <Link className={styles.link} href={`/${locale}/forgot-password`}>
            {locale === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
          </Link>
        </div>
      </div>
    </div>
  );
}
