'use client';

import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle, ArrowLeft, Camera, Upload } from 'lucide-react';
import styles from './RegistrationForm.module.css';
import {
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  sendEmailVerification,
  signOut,
  type ConfirmationResult,
} from 'firebase/auth';
import { auth } from '@/lib/firebase-client';
import { normalizePhoneNumber } from '@/lib/phone';
import { VEHICLE_TYPE_CONFIG, getVehicleLabel, isValidVehicleType, type VehicleTypeId } from '@/lib/vehicleTypes';
import SearchableCitySelect from '@/components/SearchableCitySelect';

type RegistrationRole = 'shipper' | 'merchant';

const MAX_TRUCK_IMAGE_BYTES = 10 * 1024 * 1024;

type Props = {
  role: RegistrationRole;
};

export default function RegistrationForm({ role }: Props) {
  const t = useTranslations('register');
  const locale = useLocale();
  const router = useRouter();

  const [submitted, setSubmitted] = useState(false);
  const [truckImage, setTruckImage] = useState<File | null>(null);
  const [truckImagePreview, setTruckImagePreview] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [carKindOpen, setCarKindOpen] = useState(false);
  const [customCarKind, setCustomCarKind] = useState('');

  // Phone OTP step
  const [phoneStep, setPhoneStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [confirmResult, setConfirmResult] = useState<ConfirmationResult | null>(null);
  const [pendingPhone, setPendingPhone] = useState('');
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  const [toasts, setToasts] = useState<
    Array<{
      id: string;
      title: string;
      message: string;
    }>
  >([]);

  const titleFor = (kind: 'form' | 'phone' | 'password' | 'image' | 'server' | 'network') => {
    if (locale === 'ar') {
      if (kind === 'form') return 'خطأ في النموذج';
      if (kind === 'phone') return 'خطأ في الهاتف';
      if (kind === 'password') return 'خطأ في كلمة المرور';
      if (kind === 'image') return 'خطأ في الصورة';
      if (kind === 'network') return 'خطأ في الاتصال';
      return 'خطأ في الخادم';
    }
    if (kind === 'form') return 'Form error';
    if (kind === 'phone') return 'Phone error';
    if (kind === 'password') return 'Password error';
    if (kind === 'image') return 'Image error';
    if (kind === 'network') return 'Network error';
    return 'Server error';
  };

  const pushToast = (toast: { title: string; message: string }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [{ id, ...toast }, ...prev]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((tItem) => tItem.id !== id));
    }, 5000);
  };

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    merchantCity: '',
    shipperCity: '',
    carKind: '',
    maxCharge: '',
    maxChargeUnit: 'ton',
    placeOfBusiness: '',
  });

  const selectedCarKind = VEHICLE_TYPE_CONFIG.find((opt) => opt.id === formData.carKind) ?? null;

  useEffect(() => {
    if (!carKindOpen) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (!target.closest('[data-car-kind-root="true"]')) {
        setCarKindOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCarKindOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [carKindOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (role === 'shipper') {
      if (!isValidVehicleType(formData.carKind)) {
        pushToast({
          title: titleFor('form'),
          message: locale === 'ar' ? 'يرجى اختيار نوع المركبة من القائمة' : 'Please choose a vehicle type from the list',
        });
        return;
      }
    }

    if (truckImage && truckImage.size > MAX_TRUCK_IMAGE_BYTES) {
      const maxMb = Math.floor(MAX_TRUCK_IMAGE_BYTES / (1024 * 1024));
      pushToast({
        title: titleFor('image'),
        message: locale === 'ar' ? `حجم الصورة كبير جداً. الحد الأقصى ${maxMb}MB.` : `Image is too large. Max is ${maxMb}MB.`,
      });
      return;
    }

    if (password.length < 8) {
      pushToast({ title: titleFor('password'), message: locale === 'ar' ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters' });
      return;
    }
    if (!/[A-Z]/.test(password)) {
      pushToast({ title: titleFor('password'), message: locale === 'ar' ? 'يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل' : 'Password must contain at least one uppercase letter' });
      return;
    }
    if (!/[a-z]/.test(password)) {
      pushToast({ title: titleFor('password'), message: locale === 'ar' ? 'يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل' : 'Password must contain at least one lowercase letter' });
      return;
    }
    if (!/[0-9]/.test(password)) {
      pushToast({ title: titleFor('password'), message: locale === 'ar' ? 'يجب أن تحتوي كلمة المرور على رقم واحد على الأقل' : 'Password must contain at least one number' });
      return;
    }
    if (password !== repeatPassword) {
      pushToast({ title: titleFor('password'), message: t('errors.passwordsDoNotMatch') });
      return;
    }

    const normalizedPhone = normalizePhoneNumber(formData.phone);
    if (!normalizedPhone.ok) {
      if (normalizedPhone.error === 'PHONE_REQUIRED') {
        pushToast({ title: titleFor('phone'), message: t('errors.phoneRequired') });
      } else if (normalizedPhone.error === 'PHONE_INVALID_CHARACTERS') {
        pushToast({ title: titleFor('phone'), message: t('errors.phoneInvalidCharacters') });
      } else {
        pushToast({ title: titleFor('phone'), message: t('errors.phoneInvalidLength') });
      }
      return;
    }

    // Send OTP to verify phone before creating the account
    setLoading(true);
    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
      }
      const result = await signInWithPhoneNumber(auth, normalizedPhone.e164, recaptchaRef.current);
      setPendingPhone(normalizedPhone.e164);
      setConfirmResult(result);
      setPhoneStep(true);
    } catch (err: any) {
      console.error('signInWithPhoneNumber error:', err?.code, err?.message, err);
      const firebaseCode: string = err?.code ?? 'unknown';
      let msg = locale === 'ar'
        ? `فشل إرسال رمز التحقق. (${firebaseCode})`
        : `Failed to send verification code. (${firebaseCode})`;
      if (firebaseCode === 'auth/quota-exceeded' || firebaseCode === 'auth/too-many-requests') {
        msg = locale === 'ar' ? 'تم تجاوز الحد اليومي. حاول مرة أخرى لاحقاً.' : 'SMS quota exceeded. Please try again later.';
      } else if (firebaseCode === 'auth/captcha-check-failed') {
        msg = locale === 'ar' ? 'فشل التحقق من reCAPTCHA. يرجى تحديث الصفحة والمحاولة مرة أخرى.' : 'reCAPTCHA check failed. Please refresh and try again.';
      } else if (firebaseCode === 'auth/invalid-phone-number') {
        msg = locale === 'ar' ? 'رقم الهاتف غير صالح.' : 'Invalid phone number format.';
      } else if (firebaseCode === 'auth/operation-not-allowed') {
        msg = locale === 'ar' ? 'تسجيل الدخول بالهاتف غير مفعّل.' : 'Phone auth is not enabled in Firebase.';
      }
      pushToast({ title: titleFor('phone'), message: msg });
      // Reset recaptcha on failure so next attempt creates a fresh one
      recaptchaRef.current = null;
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!confirmResult) return;
    if (!otp.trim()) {
      pushToast({ title: titleFor('phone'), message: locale === 'ar' ? 'يرجى إدخال رمز التحقق' : 'Please enter the verification code' });
      return;
    }

    setLoading(true);
    try {
      // Confirm OTP (signs in a phone-only Firebase user)
      await confirmResult.confirm(otp.trim());
      // Sign out the phone session — we only needed it for verification
      await signOut(auth);

      // Create the real email/password Firebase user
      let idToken: string;
      try {
        const cred = await createUserWithEmailAndPassword(auth, formData.email, password);
        idToken = await cred.user.getIdToken();
        // Best-effort email verification
        await sendEmailVerification(cred.user).catch(() => null);
      } catch (firebaseErr: any) {
        const code = firebaseErr?.code;
        if (code === 'auth/email-already-in-use') {
          pushToast({ title: titleFor('server'), message: locale === 'ar' ? 'البريد الإلكتروني مستخدم بالفعل' : 'Email is already in use' });
        } else {
          pushToast({ title: titleFor('server'), message: locale === 'ar' ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'Something went wrong. Please try again.' });
        }
        return;
      }

      const normalizedPhone = normalizePhoneNumber(formData.phone);
      if (!normalizedPhone.ok) {
        pushToast({ title: titleFor('phone'), message: t('errors.phoneInvalidLength') });
        return;
      }

      const payload = new FormData();
      payload.append('idToken', idToken);
      payload.append('fullName', formData.fullName);
      payload.append('email', formData.email);
      payload.append('phone', normalizedPhone.e164);
      payload.append('type', role === 'shipper' ? 'SHIPPER' : 'MERCHANT');

      if (role === 'shipper') {
        const finalCarKind = formData.carKind === 'other' && customCarKind.trim()
          ? customCarKind.trim()
          : formData.carKind;
        payload.append('carKind', finalCarKind);
        payload.append('maxCharge', formData.maxCharge);
        payload.append('maxChargeUnit', formData.maxChargeUnit);
        payload.append('shipperCity', formData.shipperCity);
        if (truckImage) payload.append('truckImage', truckImage);
      }

      if (role === 'merchant') {
        payload.append('placeOfBusiness', formData.placeOfBusiness);
        payload.append('merchantCity', formData.merchantCity);
      }

      const res = await fetch('/api/auth/signup', { method: 'POST', body: payload });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const code = data?.error;
        if (code === 'IMAGE_TOO_LARGE') {
          const maxBytes = typeof data?.maxBytes === 'number' ? data.maxBytes : MAX_TRUCK_IMAGE_BYTES;
          const maxMb = Math.floor(maxBytes / (1024 * 1024));
          pushToast({ title: titleFor('image'), message: locale === 'ar' ? `حجم الصورة كبير جداً. الحد الأقصى ${maxMb}MB.` : `Image is too large. Max is ${maxMb}MB.` });
        } else if (code === 'PHONE_REQUIRED') {
          pushToast({ title: titleFor('phone'), message: t('errors.phoneRequired') });
        } else if (code === 'PHONE_INVALID_CHARACTERS') {
          pushToast({ title: titleFor('phone'), message: t('errors.phoneInvalidCharacters') });
        } else if (code === 'PHONE_INVALID_LENGTH' || code === 'PHONE_INVALID') {
          pushToast({ title: titleFor('phone'), message: t('errors.phoneInvalidLength') });
        } else if (code === 'PASSWORD_TOO_SHORT') {
          pushToast({ title: titleFor('password'), message: t('errors.passwordTooShort') });
        } else if (code === 'FULL_NAME_REQUIRED') {
          pushToast({ title: titleFor('form'), message: locale === 'ar' ? 'الاسم الكامل مطلوب' : 'Full name is required' });
        } else if (code === 'EMAIL_OR_PHONE_REQUIRED') {
          pushToast({ title: titleFor('form'), message: locale === 'ar' ? 'يجب إدخال البريد الإلكتروني أو رقم الهاتف' : 'Email or phone is required' });
        } else if (code === 'USER_TYPE_REQUIRED') {
          pushToast({ title: titleFor('form'), message: locale === 'ar' ? 'نوع المستخدم مطلوب' : 'User type is required' });
        } else if (code === 'INVALID_CAR_KIND') {
          pushToast({ title: titleFor('form'), message: locale === 'ar' ? 'نوع المركبة غير صالح' : 'Invalid vehicle type' });
        } else if (code === 'USER_ALREADY_EXISTS') {
          pushToast({ title: titleFor('server'), message: t('errors.userAlreadyExists') });
        } else if (code === 'DATABASE_ERROR') {
          pushToast({ title: titleFor('server'), message: t('errors.databaseError') });
        } else if (code === 'IMAGE_UPLOAD_FAILED') {
          pushToast({ title: titleFor('image'), message: t('errors.imageUploadFailed') });
        } else if (code === 'FILE_SYSTEM_ERROR') {
          pushToast({ title: titleFor('server'), message: t('errors.fileSystemError') });
        } else {
          pushToast({ title: titleFor('server'), message: t('errors.signupFailed') });
        }
        return;
      }

      setSubmitted(true);
      // Don't auto-redirect — let the user read the email verification notice first
    } catch (err: any) {
      const code = err?.code;
      if (code === 'auth/invalid-verification-code' || code === 'auth/code-expired') {
        pushToast({ title: titleFor('phone'), message: locale === 'ar' ? 'رمز التحقق غير صحيح أو منتهي الصلاحية' : 'Invalid or expired verification code' });
      } else {
        console.error(err);
        pushToast({ title: titleFor('network'), message: t('errors.somethingWentWrong') });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTruckImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setTruckImage(file);

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTruckImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setTruckImagePreview(null);
    }
  };

  if (submitted) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.contentWrapper}>
          <div className={styles.formCard}>
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <CheckCircle style={{ width: 56, height: 56, color: '#10b981', margin: '0 auto 1rem' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>{t('success')}</h2>
              {formData.email ? (
                <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                  {locale === 'ar'
                    ? `تم إنشاء حسابك. تم إرسال رسالة تحقق إلى ${formData.email} — تحقق من صندوق الوارد (أو البريد المزعج) وانقر على الرابط لتفعيل بريدك الإلكتروني.`
                    : `Account created! A verification email was sent to ${formData.email} — check your inbox (or spam folder) and click the link to verify your email.`}
                </p>
              ) : (
                <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  {locale === 'ar' ? 'تم إنشاء حسابك بنجاح.' : 'Your account has been created successfully.'}
                </p>
              )}
              <Link href={`/${locale}`} className={styles.submitButton} style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}>
                {locale === 'ar' ? 'الذهاب للصفحة الرئيسية' : 'Go to Home'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phoneStep) {
    return (
      <div className={styles.pageContainer}>
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
        <div className={styles.contentWrapper}>
          <div className={styles.formCard}>
            <div className={styles.header}>
              <h1 className={styles.title}>
                {locale === 'ar' ? 'التحقق من رقم الهاتف' : 'Phone Verification'}
              </h1>
              <p className={styles.description}>
                {locale === 'ar'
                  ? `تم إرسال رمز مكون من 6 أرقام إلى ${pendingPhone}`
                  : `A 6-digit code was sent to ${pendingPhone}`}
              </p>
            </div>
            <div className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  {locale === 'ar' ? 'رمز التحقق' : 'Verification Code'}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  className={styles.input}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder={locale === 'ar' ? 'أدخل الرمز المكون من 6 أرقام' : 'Enter 6-digit code'}
                  autoFocus
                />
              </div>
              <button
                type="button"
                className={styles.submitButton}
                onClick={handleVerifyOtp}
                disabled={loading || otp.length < 4}
              >
                {loading
                  ? (locale === 'ar' ? 'جاري التحقق...' : 'Verifying...')
                  : (locale === 'ar' ? 'تحقق وأكمل التسجيل' : 'Verify & Complete Registration')}
              </button>
              <button
                type="button"
                className={styles.cancelOtpButton}
                onClick={() => { setPhoneStep(false); setOtp(''); setConfirmResult(null); recaptchaRef.current = null; }}
                disabled={loading}
              >
                {locale === 'ar' ? 'رجوع وتعديل' : 'Back & Edit'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
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
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
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

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  {t('email')} <span className={styles.optionalText}>({locale === 'ar' ? 'اختياري' : 'Optional'})</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="example@email.com"
                />
              </div>

              <div className={styles.formGroup}>
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

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  {role === 'shipper' ? t('shipperCity') : t('merchantCity')}
                </label>
                {role === 'merchant' ? (
                  <SearchableCitySelect
                    value={formData.merchantCity}
                    onChange={(value) => setFormData({ ...formData, merchantCity: value || '' })}
                    locale={locale as 'ar' | 'en'}
                    placeholder={locale === 'ar' ? 'ابحث عن مدينة...' : 'Search for a city...'}
                  />
                ) : (
                  <input
                    type="text"
                    name="shipperCity"
                    value={formData.shipperCity}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder={locale === 'ar' ? 'أدخل مكان عملك' : 'Enter your place of work'}
                  />
                )}
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>{locale === 'ar' ? 'كلمة المرور' : 'Password'}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>{locale === 'ar' ? 'تأكيد كلمة المرور' : 'Repeat password'}</label>
                <input
                  type="password"
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  required
                  className={styles.input}
                />
              </div>
            </div>

            {role === 'shipper' && (
              <>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>{t('carKind')} <span className={styles.required}></span></label>
                    <div className={styles.carKindRoot} data-car-kind-root="true">
                      <button
                        type="button"
                        className={`${styles.input} ${styles.carKindButton}`}
                        aria-haspopup="listbox"
                        aria-expanded={carKindOpen ? 'true' : 'false'}
                        aria-required="true"
                        onClick={() => setCarKindOpen((v) => !v)}
                      >
                        {selectedCarKind ? (
                          <span className={styles.carKindButtonInner}>
                            <img
                              src={selectedCarKind.image.src}
                              alt={getVehicleLabel(selectedCarKind.id, locale === 'ar' ? 'ar' : 'en')}
                              className={styles.carKindThumb}
                              loading="lazy"
                            />
                            <span className={styles.carKindButtonLabel}>{getVehicleLabel(selectedCarKind.id, locale === 'ar' ? 'ar' : 'en')}</span>
                          </span>
                        ) : (
                          <span className={styles.carKindPlaceholder}>
                            {locale === 'ar' ? 'اختر نوع المركبة' : 'Choose vehicle type'}
                          </span>
                        )}
                      </button>

                      {carKindOpen ? (
                        <div className={styles.carKindPopover} role="listbox">
                          {VEHICLE_TYPE_CONFIG.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              className={styles.carKindOption}
                              role="option"
                              aria-selected={opt.id === formData.carKind ? 'true' : 'false'}
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, carKind: opt.id }));
                                if (opt.id !== 'other') setCustomCarKind('');
                                setCarKindOpen(false);
                              }}
                            >
                              <img
                                src={opt.image.src}
                                alt={getVehicleLabel(opt.id, locale === 'ar' ? 'ar' : 'en')}
                                className={styles.carKindOptionThumb}
                                loading="lazy"
                              />
                              <span className={styles.carKindOptionLabel}>{getVehicleLabel(opt.id, locale === 'ar' ? 'ar' : 'en')}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}

                      <input type="hidden" name="carKind" value={formData.carKind === 'other' && customCarKind ? customCarKind : formData.carKind} required />
                    </div>
                    {formData.carKind === 'other' && (
                      <div className={styles.formGroup} style={{ marginTop: '0.5rem' }}>
                        <input
                          type="text"
                          value={customCarKind}
                          onChange={(e) => setCustomCarKind(e.target.value)}
                          className={styles.input}
                          placeholder={locale === 'ar' ? 'أدخل نوع المركبة' : 'Enter vehicle type'}
                          required
                        />
                      </div>
                    )}
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>{t('maxCharge')}</label>
                    <div className={styles.inputGroup}>
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
                      />
                      <select
                        name="maxChargeUnit"
                        value={formData.maxChargeUnit}
                        onChange={(e) =>
                          setFormData({ ...formData, maxChargeUnit: e.target.value })
                        }
                        className={styles.select}
                      >
                        <option value="kg">kg</option>
                        <option value="ton">ton</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className={styles.formGroupFull}>
                  <label className={styles.label}>{t('truckImage')}</label>
                  <div className={styles.fileInputContainer}>
                    <input
                      type="file"
                      id="truckImage"
                      name="truckImage"
                      accept="image/*"
                      onChange={handleTruckImageChange}
                      className={styles.fileInput}
                    />
                    <label
                      htmlFor="truckImage"
                      className={`${styles.fileInputLabel} ${truckImage ? styles.hasFile : ''}`}
                    >
                      {truckImage ? (
                        <>
                          <Camera className={styles.fileInputIcon} />
                          <span className={styles.fileInputText}>
                            {locale === 'ar' ? 'تم اختيار صورة' : 'Image selected'}
                          </span>
                          <span className={styles.fileInputSubtext}>
                            {locale === 'ar' ? 'انقر لتغيير الصورة' : 'Click to change image'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Upload className={styles.fileInputIcon} />
                          <span className={styles.fileInputText}>
                            {locale === 'ar' ? 'انقر لرفع صورة الشاحنة' : 'Click to upload truck image'}
                          </span>
                          <span className={styles.fileInputSubtext}>
                            {locale === 'ar' ? 'JPG, PNG, أو GIF بحد أقصى 10MB' : 'JPG, PNG, or GIF up to 10MB'}
                          </span>
                        </>
                      )}
                    </label>
                  </div>

                  {truckImagePreview && (
                    <div className={styles.filePreview}>
                      <img
                        src={truckImagePreview}
                        alt="Truck preview"
                        className={styles.filePreviewImage}
                      />
                      <div className={styles.fileName}>{truckImage?.name}</div>
                    </div>
                  )}
                </div>
              </>
            )}

            {role === 'merchant' && (
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{t('placeOfBusiness')}</label>
                  <input
                    type="text"
                    name="placeOfBusiness"
                    value={formData.placeOfBusiness}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder={locale === 'ar' ? 'وصف مجال العمل' : 'Job description'}
                  />
                </div>
              </div>
            )}

            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? (locale === 'ar' ? 'جاري الإرسال...' : 'Sending code...') : t('submit')}
            </button>
            <div id="recaptcha-container" />
          </form>
        </div>
      </div>
    </div>
  );
}