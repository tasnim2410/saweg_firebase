'use client';

import { useLocale } from 'next-intl';
import { useState } from 'react';
// Note: after password reset, Firebase redirects to saweg-f8c50.firebaseapp.com (default handler)
// To redirect back to your app instead, add your domain to Firebase Console →
// Authentication → Settings → Authorized domains, then restore the `url` parameter.
import Link from 'next/link';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';
import styles from '../login/auth.module.css';

export default function ForgotPasswordClient() {
  const locale = useLocale();
  const isAr = locale === 'ar';

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError(isAr ? 'يرجى إدخال البريد الإلكتروني' : 'Please enter your email');
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (err: any) {
      const code = err?.code;
      if (code === 'auth/user-not-found' || code === 'auth/invalid-email' || code === 'auth/invalid-credential') {
        setError(isAr ? 'هذا البريد الإلكتروني غير مسجل' : 'This email is not registered');
      } else {
        setError(isAr ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            {isAr ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
          </h1>
        </div>

        {error && (
          <div className={styles.linkRow}>
            <p className={styles.error}>{error}</p>
          </div>
        )}

        {sent ? (
          <div className={styles.linkRow}>
            <p style={{ color: '#10b981', fontSize: '0.875rem' }}>
              {isAr
                ? 'تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني. تحقق من صندوق الوارد.'
                : 'Password reset link sent. Check your inbox.'}
            </p>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '1rem' }}>
              {isAr
                ? 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين'
                : 'Enter your email and we will send you a reset link'}
            </p>
            <div>
              <label className={styles.label}>{isAr ? 'البريد الإلكتروني' : 'Email'}</label>
              <input
                className={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                required
              />
            </div>

            <button className={styles.button} type="submit" disabled={loading}>
              {loading
                ? (isAr ? 'جاري الإرسال...' : 'Sending...')
                : (isAr ? 'إرسال الرابط' : 'Send Reset Link')}
            </button>
          </form>
        )}

        <div className={styles.linkRow}>
          <span>{isAr ? 'تذكرت كلمة المرور؟' : 'Remember your password?'}</span>
          <Link className={styles.link} href={`/${locale}/login`}>
            {isAr ? 'تسجيل الدخول' : 'Login'}
          </Link>
        </div>
      </div>
    </div>
  );
}
