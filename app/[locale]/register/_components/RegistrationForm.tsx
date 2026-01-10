'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Upload, Camera } from 'lucide-react';
import styles from '../register.module.css';
import { normalizePhoneNumber } from '@/lib/phone';

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

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    merchantCity: '',
    shipperCity: '',
    carKind: '',
    maxCharge: '',
    maxChargeUnit: 'kg',
    placeOfBusiness: '',
    trucksNeeded: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (truckImage && truckImage.size > MAX_TRUCK_IMAGE_BYTES) {
      const maxMb = Math.floor(MAX_TRUCK_IMAGE_BYTES / (1024 * 1024));
      pushToast({
        title: titleFor('image'),
        message: locale === 'ar' ? `حجم الصورة كبير جداً. الحد الأقصى ${maxMb}MB.` : `Image is too large. Max is ${maxMb}MB.`,
      });
      return;
    }

    if (password.length < 6) {
      pushToast({ title: titleFor('password'), message: t('errors.passwordTooShort') });
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

    const payload = new FormData();
    payload.append('fullName', formData.fullName);
    payload.append('email', formData.email);
    payload.append('phone', normalizedPhone.e164);
    payload.append('password', password);
    payload.append('type', role === 'shipper' ? 'SHIPPER' : 'MERCHANT');

    if (role === 'shipper') {
      payload.append('carKind', formData.carKind);
      payload.append('maxCharge', formData.maxCharge);
      payload.append('maxChargeUnit', formData.maxChargeUnit);
      payload.append('shipperCity', formData.shipperCity);
      if (truckImage) payload.append('truckImage', truckImage);
    }

    if (role === 'merchant') {
      payload.append('placeOfBusiness', formData.placeOfBusiness);
      payload.append('trucksNeeded', formData.trucksNeeded);
      payload.append('merchantCity', formData.merchantCity);
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        body: payload,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const code = data?.error;
        if (code === 'IMAGE_TOO_LARGE') {
          const maxBytes = typeof data?.maxBytes === 'number' ? data.maxBytes : MAX_TRUCK_IMAGE_BYTES;
          const maxMb = Math.floor(maxBytes / (1024 * 1024));
          pushToast({
            title: titleFor('image'),
            message: locale === 'ar' ? `حجم الصورة كبير جداً. الحد الأقصى ${maxMb}MB.` : `Image is too large. Max is ${maxMb}MB.`,
          });
        } else if (code === 'PHONE_REQUIRED') {
          pushToast({ title: titleFor('phone'), message: t('errors.phoneRequired') });
        } else if (code === 'PHONE_INVALID_CHARACTERS') {
          pushToast({ title: titleFor('phone'), message: t('errors.phoneInvalidCharacters') });
        } else if (code === 'PHONE_INVALID_LENGTH' || code === 'PHONE_INVALID') {
          pushToast({ title: titleFor('phone'), message: t('errors.phoneInvalidLength') });
        } else if (code === 'PASSWORD_TOO_SHORT') {
          pushToast({ title: titleFor('password'), message: t('errors.passwordTooShort') });
        } else if (code === 'USER_ALREADY_EXISTS') {
          pushToast({ title: titleFor('server'), message: t('errors.userAlreadyExists') });
        } else {
          pushToast({ title: titleFor('server'), message: t('errors.signupFailed') });
        }
        return;
      }

      setSubmitted(true);
      router.push(`/${locale}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      pushToast({ title: titleFor('network'), message: t('errors.somethingWentWrong') });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
                <input
                  type="text"
                  name={role === 'shipper' ? 'shipperCity' : 'merchantCity'}
                  value={role === 'shipper' ? formData.shipperCity : formData.merchantCity}
                  onChange={handleChange}
                  required
                  className={styles.input}
                  placeholder={
                    role === 'shipper'
                      ? (locale === 'ar' ? 'أدخل مكان عملك' : 'Enter your place of work')
                      : (locale === 'ar' ? 'أدخل مدينتك' : 'Enter your city')
                  }
                />
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
                          ? 'مثال: شاحنة صغيرة, شاحنة كبيرة, مع حافظة, مع جرار'
                          : 'e.g. Small truck / Big truck with trailer'
                      }
                    />
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
                    required
                    className={styles.input}
                    placeholder={locale === 'ar' ? 'وصف مجال العمل' : 'Job description'}
                  />
                </div>

                <div className={styles.formGroup}>
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
                        ? 'مثال: شاحنة صغيرة...'
                        : 'e.g. small truck...'
                    }
                  />
                </div>
              </div>
            )}

            <button type="submit" className={styles.submitButton}>
              {loading ? (locale === 'ar' ? 'جاري الإرسال...' : 'Submitting...') : t('submit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}