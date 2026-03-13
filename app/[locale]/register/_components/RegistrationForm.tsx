'use client';

import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CheckCircle, ArrowLeft, Camera, Upload } from 'lucide-react';
import styles from './RegistrationForm.module.css';
import { createUserWithEmailAndPassword } from 'firebase/auth';
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

    // Create Firebase user first, then get idToken for the server
    let idToken: string;
    try {
      const cred = await createUserWithEmailAndPassword(auth, formData.email, password);
      idToken = await cred.user.getIdToken();
    } catch (firebaseErr: any) {
      const code = firebaseErr?.code;
      if (code === 'auth/email-already-in-use') {
        pushToast({
          title: titleFor('server'),
          message: locale === 'ar' ? 'البريد الإلكتروني مستخدم بالفعل' : 'Email is already in use',
        });
      } else {
        pushToast({ title: titleFor('server'), message: locale === 'ar' ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'Something went wrong. Please try again.' });
      }
      setLoading(false);
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
        } else if (code === 'INTERNAL_ERROR') {
          pushToast({ title: titleFor('server'), message: t('errors.signupFailed') });
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
                              src={selectedCarKind.imagePath}
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
                                src={opt.imagePath}
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

            <button type="submit" className={styles.submitButton}>
              {loading ? (locale === 'ar' ? 'جاري الإرسال...' : 'Submitting...') : t('submit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}