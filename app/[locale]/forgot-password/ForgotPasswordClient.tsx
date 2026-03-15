'use client';

import { useLocale } from 'next-intl';
import { useRef, useState } from 'react';
// Note: after password reset, Firebase redirects to saweg-f8c50.firebaseapp.com (default handler)
// To redirect back to your app instead, add your domain to Firebase Console →
// Authentication → Settings → Authorized domains, then restore the `url` parameter.
import Link from 'next/link';
import { sendPasswordResetEmail, signInWithPhoneNumber, signOut, RecaptchaVerifier, type ConfirmationResult } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';
import { normalizePhoneNumber } from '@/lib/phone';
import styles from '../login/auth.module.css';

type Tab = 'email' | 'phone';
type PhoneStep = 'input' | 'otp' | 'newpassword';

export default function ForgotPasswordClient() {
  const locale = useLocale();
  const isAr = locale === 'ar';

  const [tab, setTab] = useState<Tab>('email');

  // Email reset state
  const [email, setEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  // Phone reset state
  const [phone, setPhone] = useState('');
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('input');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordRepeat, setNewPasswordRepeat] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [phoneDone, setPhoneDone] = useState(false);
  const [confirmResult, setConfirmResult] = useState<ConfirmationResult | null>(null);
  const [phoneIdToken, setPhoneIdToken] = useState('');
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  // — Email tab handlers —
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');

    if (!email.trim()) {
      setEmailError(isAr ? 'يرجى إدخال البريد الإلكتروني' : 'Please enter your email');
      return;
    }

    setEmailLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setEmailSent(true);
    } catch (err: any) {
      const code = err?.code;
      if (code === 'auth/user-not-found' || code === 'auth/invalid-email' || code === 'auth/invalid-credential') {
        setEmailError(isAr ? 'هذا البريد الإلكتروني غير مسجل' : 'This email is not registered');
      } else {
        setEmailError(isAr ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'Something went wrong. Please try again.');
      }
    } finally {
      setEmailLoading(false);
    }
  };

  // — Phone tab handlers —
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');

    if (!phone.trim()) {
      setPhoneError(isAr ? 'يرجى إدخال رقم الهاتف' : 'Please enter your phone number');
      return;
    }

    const normalized = normalizePhoneNumber(phone.trim());
    if (!normalized.ok) {
      setPhoneError(isAr ? 'رقم الهاتف غير صالح. أدخله بالتنسيق الدولي مثل: +21629633247' : 'Invalid phone number. Use international format e.g. +21629633247');
      return;
    }

    setPhoneLoading(true);
    try {
      recaptchaRef.current?.clear?.();
      recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-phone-container', { size: 'invisible' });
      const result = await signInWithPhoneNumber(auth, normalized.e164, recaptchaRef.current);
      setConfirmResult(result);
      setPhoneStep('otp');
    } catch (err: any) {
      console.error('signInWithPhoneNumber (forgot-password) error:', err?.code, err?.message);
      const code: string = err?.code ?? 'unknown';
      setPhoneError(isAr
        ? `فشل إرسال رمز التحقق. (${code})`
        : `Failed to send verification code. (${code})`);
      recaptchaRef.current = null;
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleConfirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');

    if (!otp.trim() || !confirmResult) {
      setPhoneError(isAr ? 'يرجى إدخال رمز التحقق' : 'Please enter the verification code');
      return;
    }

    setPhoneLoading(true);
    try {
      const userCred = await confirmResult.confirm(otp.trim());
      const token = await userCred.user.getIdToken();
      setPhoneIdToken(token);
      // Sign out — we have the token, we'll use it for the password reset API
      await signOut(auth);
      setPhoneStep('newpassword');
    } catch (err: any) {
      const code = err?.code;
      if (code === 'auth/invalid-verification-code' || code === 'auth/code-expired') {
        setPhoneError(isAr ? 'رمز التحقق غير صحيح أو منتهي الصلاحية' : 'Invalid or expired verification code');
      } else {
        setPhoneError(isAr ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'Something went wrong. Please try again.');
      }
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');

    if (newPassword.length < 8) {
      setPhoneError(isAr ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setPhoneError(isAr ? 'يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل' : 'Password must contain at least one uppercase letter');
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      setPhoneError(isAr ? 'يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل' : 'Password must contain at least one lowercase letter');
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setPhoneError(isAr ? 'يجب أن تحتوي كلمة المرور على رقم واحد على الأقل' : 'Password must contain at least one number');
      return;
    }
    if (newPassword !== newPasswordRepeat) {
      setPhoneError(isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }

    setPhoneLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password-phone', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idToken: phoneIdToken, newPassword }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const code = data?.error;
        if (code === 'USER_NOT_FOUND') {
          setPhoneError(isAr ? 'لا يوجد حساب مرتبط بهذا الرقم' : 'No account found for this phone number');
        } else if (code === 'WEAK_PASSWORD') {
          setPhoneError(isAr ? 'كلمة المرور لا تستوفي متطلبات الأمان' : 'Password does not meet security requirements');
        } else {
          setPhoneError(isAr ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'Something went wrong. Please try again.');
        }
        return;
      }
      setPhoneDone(true);
    } catch {
      setPhoneError(isAr ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'Something went wrong. Please try again.');
    } finally {
      setPhoneLoading(false);
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

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: 0 }}>
          <button
            type="button"
            onClick={() => setTab('email')}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: 'none',
              border: 'none',
              borderBottom: tab === 'email' ? '2px solid #FFB81C' : '2px solid transparent',
              fontWeight: tab === 'email' ? 700 : 400,
              color: tab === 'email' ? '#111827' : '#6b7280',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            {isAr ? 'بالبريد الإلكتروني' : 'By Email'}
          </button>
          <button
            type="button"
            onClick={() => setTab('phone')}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: 'none',
              border: 'none',
              borderBottom: tab === 'phone' ? '2px solid #FFB81C' : '2px solid transparent',
              fontWeight: tab === 'phone' ? 700 : 400,
              color: tab === 'phone' ? '#111827' : '#6b7280',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            {isAr ? 'برقم الهاتف' : 'By Phone'}
          </button>
        </div>

        {/* ── Email tab ── */}
        {tab === 'email' && (
          <>
            {emailError && (
              <div className={styles.linkRow}>
                <p className={styles.error}>{emailError}</p>
              </div>
            )}
            {emailSent ? (
              <div className={styles.linkRow}>
                <p style={{ color: '#10b981', fontSize: '0.875rem' }}>
                  {isAr
                    ? 'تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني. تحقق من صندوق الوارد.'
                    : 'Password reset link sent. Check your inbox.'}
                </p>
              </div>
            ) : (
              <form className={styles.form} onSubmit={handleEmailSubmit}>
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
                <button className={styles.button} type="submit" disabled={emailLoading}>
                  {emailLoading
                    ? (isAr ? 'جاري الإرسال...' : 'Sending...')
                    : (isAr ? 'إرسال الرابط' : 'Send Reset Link')}
                </button>
              </form>
            )}
          </>
        )}

        {/* ── Phone tab ── */}
        {tab === 'phone' && (
          <>
            {phoneError && (
              <div className={styles.linkRow}>
                <p className={styles.error}>{phoneError}</p>
              </div>
            )}

            {phoneDone ? (
              <div className={styles.linkRow}>
                <p style={{ color: '#10b981', fontSize: '0.875rem' }}>
                  {isAr ? 'تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.' : 'Password changed successfully. You can now log in.'}
                </p>
              </div>
            ) : phoneStep === 'input' ? (
              <form className={styles.form} onSubmit={handleSendOtp}>
                <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  {isAr
                    ? 'أدخل رقم هاتفك وسنرسل إليك رمز التحقق'
                    : 'Enter your phone number and we will send you a verification code'}
                </p>
                <div>
                  <label className={styles.label}>{isAr ? 'رقم الهاتف' : 'Phone Number'}</label>
                  <input
                    className={styles.input}
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+218XXXXXXXXX"
                    autoComplete="tel"
                    required
                  />
                </div>
                <div id="recaptcha-phone-container" />
                <button className={styles.button} type="submit" disabled={phoneLoading}>
                  {phoneLoading
                    ? (isAr ? 'جاري الإرسال...' : 'Sending...')
                    : (isAr ? 'إرسال الرمز' : 'Send Code')}
                </button>
              </form>
            ) : phoneStep === 'otp' ? (
              <form className={styles.form} onSubmit={handleConfirmOtp}>
                <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  {isAr ? `تم إرسال رمز مكون من 6 أرقام إلى ${phone}` : `A 6-digit code was sent to ${phone}`}
                </p>
                <div>
                  <label className={styles.label}>{isAr ? 'رمز التحقق' : 'Verification Code'}</label>
                  <input
                    className={styles.input}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder={isAr ? 'أدخل الرمز' : 'Enter code'}
                    autoFocus
                    required
                  />
                </div>
                <button className={styles.button} type="submit" disabled={phoneLoading || otp.length < 4}>
                  {phoneLoading ? (isAr ? 'جاري التحقق...' : 'Verifying...') : (isAr ? 'تحقق' : 'Verify')}
                </button>
                <button
                  type="button"
                  onClick={() => { setPhoneStep('input'); setOtp(''); setConfirmResult(null); setPhoneError(''); recaptchaRef.current = null; }}
                  style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'underline' }}
                >
                  {isAr ? 'رجوع' : 'Back'}
                </button>
              </form>
            ) : (
              <form className={styles.form} onSubmit={handleResetPassword}>
                <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  {isAr ? 'أدخل كلمة المرور الجديدة' : 'Enter your new password'}
                </p>
                <div>
                  <label className={styles.label}>{isAr ? 'كلمة المرور الجديدة' : 'New Password'}</label>
                  <input
                    className={styles.input}
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div>
                  <label className={styles.label}>{isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'}</label>
                  <input
                    className={styles.input}
                    type="password"
                    value={newPasswordRepeat}
                    onChange={(e) => setNewPasswordRepeat(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
                <p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                  {isAr
                    ? 'يجب أن تحتوي على 8 أحرف على الأقل، حرف كبير، حرف صغير، ورقم'
                    : 'At least 8 characters with uppercase, lowercase and a number'}
                </p>
                <button className={styles.button} type="submit" disabled={phoneLoading}>
                  {phoneLoading ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ كلمة المرور' : 'Save Password')}
                </button>
              </form>
            )}
          </>
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
