'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import styles from '../login/auth.module.css';

export default function ForgotPasswordClient() {
  const locale = useLocale();
  const router = useRouter();
  const isAr = locale === 'ar';

  // Step 1: Email, Step 2: Code, Step 3: New Password
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const getTitle = () => {
    if (step === 1) return isAr ? 'إعادة تعيين كلمة المرور' : 'Reset Password';
    if (step === 2) return isAr ? 'أدخل الرمز' : 'Enter Code';
    return isAr ? 'كلمة مرور جديدة' : 'New Password';
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError(isAr ? 'يرجى إدخال البريد الإلكتروني' : 'Please enter your email');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, locale }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        const errorMsg = data?.error === 'EMAIL_NOT_REGISTERED'
          ? (isAr ? 'هذا البريد الإلكتروني غير مسجل' : 'This email is not registered')
          : (isAr ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'Something went wrong. Please try again.');
        setError(errorMsg);
        setLoading(false);
        return;
      }

      // In development, show the code
      if (data.devCode) {
        setSuccess(isAr
          ? `تم إرسال الرمز: ${data.devCode} (وضع التطوير)`
          : `Code sent: ${data.devCode} (dev mode)`
        );
      } else {
        setSuccess(isAr
          ? 'تم إرسال رمز التحقق إلى بريدك الإلكتروني'
          : 'Verification code sent to your email'
        );
      }

      setTimeout(() => {
        setStep(2);
        setSuccess('');
      }, 1500);
    } catch {
      setError(isAr ? 'حدث خطأ في الاتصال' : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!code.trim() || code.length !== 6) {
      setError(isAr ? 'يرجى إدخال الرمز المكون من 6 أرقام' : 'Please enter the 6-digit code');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        setError(isAr ? 'الرمز غير صالح أو منتهي الصلاحية' : 'Invalid or expired code');
        setLoading(false);
        return;
      }

      setToken(data.token);
      setStep(3);
    } catch {
      setError(isAr ? 'حدث خطأ في الاتصال' : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || newPassword.length < 6) {
      setError(isAr ? 'يجب أن تكون كلمة المرور 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(isAr ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, token, newPassword }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        const errorMsg = data?.error === 'PASSWORD_TOO_SHORT'
          ? (isAr ? 'كلمة المرور قصيرة جداً' : 'Password is too short')
          : (isAr ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'Something went wrong. Please try again.');
        setError(errorMsg);
        setLoading(false);
        return;
      }

      setSuccess(isAr ? 'تم تغيير كلمة المرور بنجاح!' : 'Password changed successfully!');

      setTimeout(() => {
        router.push(`/${locale}/login`);
      }, 1500);
    } catch {
      setError(isAr ? 'حدث خطأ في الاتصال' : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>{getTitle()}</h1>
        </div>

        {error && (
          <div className={styles.linkRow}>
            <p className={styles.error}>{error}</p>
          </div>
        )}

        {success && (
          <div className={styles.linkRow}>
            <p style={{ color: '#10b981', fontSize: '0.875rem' }}>{success}</p>
          </div>
        )}

        {step === 1 && (
          <form className={styles.form} onSubmit={handleRequestCode}>
            <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '1rem' }}>
              {isAr
                ? 'أدخل بريدك الإلكتروني وسنرسل لك رمز التحقق'
                : 'Enter your email and we will send you a verification code'}
            </p>
            <div>
              <label className={styles.label}>{isAr ? 'البريد الإلكتروني' : 'Email'}</label>
              <input
                className={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isAr ? 'your@email.com' : 'your@email.com'}
                autoComplete="email"
                required
              />
            </div>

            <button className={styles.button} type="submit" disabled={loading}>
              {loading
                ? (isAr ? 'جاري الإرسال...' : 'Sending...')
                : (isAr ? 'إرسال الرمز' : 'Send Code')}
            </button>
          </form>
        )}

        {step === 2 && (
          <form className={styles.form} onSubmit={handleVerifyCode}>
            <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '1rem' }}>
              {isAr
                ? `أدخل الرمز المكون من 6 أرقام المرسل إلى ${email}`
                : `Enter the 6-digit code sent to ${email}`}
            </p>
            <div>
              <label className={styles.label}>{isAr ? 'رمز التحقق' : 'Verification Code'}</label>
              <input
                className={styles.input}
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={isAr ? '••••••' : '••••••'}
                maxLength={6}
                required
              />
            </div>

            <button className={styles.button} type="submit" disabled={loading}>
              {loading
                ? (isAr ? 'جاري التحقق...' : 'Verifying...')
                : (isAr ? 'تحقق' : 'Verify')}
            </button>

            <button
              type="button"
              className={styles.link}
              style={{ background: 'none', border: 'none', cursor: 'pointer', marginTop: '1rem' }}
              onClick={() => setStep(1)}
            >
              {isAr ? 'إعادة إرسال الرمز' : 'Resend Code'}
            </button>
          </form>
        )}

        {step === 3 && (
          <form className={styles.form} onSubmit={handleResetPassword}>
            <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '1rem' }}>
              {isAr
                ? 'أدخل كلمة المرور الجديدة'
                : 'Enter your new password'}
            </p>
            <div>
              <label className={styles.label}>{isAr ? 'كلمة المرور الجديدة' : 'New Password'}</label>
              <input
                className={styles.input}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={isAr ? '********' : '********'}
                autoComplete="new-password"
                required
              />
            </div>

            <div>
              <label className={styles.label}>{isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'}</label>
              <input
                className={styles.input}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={isAr ? '********' : '********'}
                autoComplete="new-password"
                required
              />
            </div>

            <button className={styles.button} type="submit" disabled={loading}>
              {loading
                ? (isAr ? 'جاري الحفظ...' : 'Saving...')
                : (isAr ? 'تغيير كلمة المرور' : 'Change Password')}
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
