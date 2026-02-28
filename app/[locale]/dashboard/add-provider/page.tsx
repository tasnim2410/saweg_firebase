'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './add-provider.module.css';
import { normalizePhoneNumber } from '@/lib/phone';
import { getFormattedLocationName } from '@/lib/geocoding';
import SearchableCitySelect from '@/components/SearchableCitySelect';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const MAX_PROVIDER_IMAGE_BYTES = 10 * 1024 * 1024;

type Coords = { latitude: number; longitude: number } | null;

export default function AddProviderPage() {
  const t = useTranslations('providerForm');
  const locale = useLocale();
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [toasts, setToasts] = useState<
    Array<{
      id: string;
      variant: 'error' | 'success' | 'info';
      title: string;
      message: string;
    }>
  >([]);

  const [name, setName] = useState('');
  const [destination, setDestination] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmImageUrl, setConfirmImageUrl] = useState<string | null>(null);
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [coords, setCoords] = useState<Coords>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [currentLocationName, setCurrentLocationName] = useState<string | null>(null);

  const pushToast = (toast: { variant: 'error' | 'success' | 'info'; title: string; message: string }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [{ id, ...toast }, ...prev]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((tItem) => tItem.id !== id));
    }, 5000);
  };

  const titleFor = (kind: 'image' | 'phone' | 'form' | 'server' | 'network' | 'success') => {
    if (locale === 'ar') {
      if (kind === 'image') return 'خطأ في الصورة';
      if (kind === 'phone') return 'خطأ في الهاتف';
      if (kind === 'form') return 'خطأ في النموذج';
      if (kind === 'network') return 'خطأ في الاتصال';
      if (kind === 'success') return 'تم بنجاح';
      return 'خطأ في الخادم';
    }

    if (kind === 'image') return 'Image error';
    if (kind === 'phone') return 'Phone error';
    if (kind === 'form') return 'Form error';
    if (kind === 'network') return 'Network error';
    if (kind === 'success') return 'Success';
    return 'Server error';
  };

  const imageTooLargeMessage = (maxBytes: number) => {
    const maxMb = Math.floor(maxBytes / (1024 * 1024));
    return locale === 'ar' ? `حجم الصورة كبير جداً. الحد الأقصى ${maxMb}MB.` : `File is too large. Max is ${maxMb}MB.`;
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        const type = data?.user?.type;
        const admin = Boolean(data?.user?.isAdmin);
        setIsAdmin(admin);
        if (!admin && type === 'MERCHANT') {
          router.push(`/${locale}`);
          router.refresh();
          return;
        }
        const fullName = data?.user?.fullName;
        if (typeof fullName === 'string') setName(fullName);
        const userPhone = data?.user?.phone;
        if (typeof userPhone === 'string') setPhone(userPhone);
        
        // Auto-fetch current location on load since it's the default
        if (!cancelled) {
          getCurrentLocation();
        }
      } catch {
        if (cancelled) return;
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!imageFile) {
      setConfirmImageUrl(null);
      return;
    }

    const url = URL.createObjectURL(imageFile);
    setConfirmImageUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  useEffect(() => {
    if (!confirmOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirmOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [confirmOpen]);

  // Periodically update location when using current location (every hour)
  useEffect(() => {
    if (!useCurrentLocation || !coords) return;

    const LOCATION_UPDATE_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds

    const updateLocation = async () => {
      if (!navigator.geolocation) return;
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Only update if location has changed significantly (more than 100 meters)
          const distance = calculateDistance(coords.latitude, coords.longitude, lat, lng);
          if (distance > 0.1) { // 0.1 km = 100 meters
            setCoords({ latitude: lat, longitude: lng });
            
            try {
              const locationName = await getFormattedLocationName(lat, lng, locale as 'ar' | 'en');
              setCurrentLocationName(locationName);
              await saveLocationToDatabase(lat, lng, locationName);
            } catch {
              await saveLocationToDatabase(lat, lng, null);
            }
          }
        },
        () => {
          // Silently fail on error
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    };

    // Update immediately when checkbox is checked
    updateLocation();

    // Set up periodic updates
    const intervalId = setInterval(updateLocation, LOCATION_UPDATE_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [useCurrentLocation, coords]);

  // Calculate distance between two coordinates in km using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const validateForSubmit = () => {
    if (imageFile && imageFile.size > MAX_PROVIDER_IMAGE_BYTES) {
      pushToast({
        variant: 'error',
        title: titleFor('image'),
        message: imageTooLargeMessage(MAX_PROVIDER_IMAGE_BYTES),
      });
      return { ok: false as const };
    }

    if ((!location || !location.trim()) || !phone.trim()) {
      if (!useCurrentLocation && (!location || !location.trim())) {
        pushToast({
          variant: 'error',
          title: titleFor('form'),
          message: t('errors.missingRequiredFields'),
        });
        return { ok: false as const };
      }
      if (!phone.trim()) {
        pushToast({
          variant: 'error',
          title: titleFor('form'),
          message: t('errors.missingRequiredFields'),
        });
        return { ok: false as const };
      }
    }
    if (useCurrentLocation && !coords) {
      pushToast({
        variant: 'error',
        title: titleFor('form'),
        message: locale === 'ar' ? 'الرجاء الحصول على الموقع الحالي أولاً.' : 'Please get your current location first.',
      });
      return { ok: false as const };
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone.ok) {
      if (normalizedPhone.error === 'PHONE_REQUIRED') {
        pushToast({ variant: 'error', title: titleFor('phone'), message: t('errors.phoneRequired') });
      } else if (normalizedPhone.error === 'PHONE_INVALID_CHARACTERS') {
        pushToast({ variant: 'error', title: titleFor('phone'), message: t('errors.phoneInvalidCharacters') });
      } else {
        pushToast({ variant: 'error', title: titleFor('phone'), message: t('errors.phoneInvalidLength') });
      }
      return { ok: false as const };
    }

    return { ok: true as const, normalizedPhoneE164: normalizedPhone.e164 };
  };

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      pushToast({
        variant: 'error',
        title: titleFor('form'),
        message: locale === 'ar' ? 'الموقع الجغرافي غير مدعوم في هذا المتصفح.' : 'Geolocation is not supported by your browser.',
      });
      return;
    }
    setIsLocating(true);
    setCurrentLocationName(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCoords({ latitude: lat, longitude: lng });
        
        // Get location name from coordinates
        try {
          const locationName = await getFormattedLocationName(lat, lng, locale as 'ar' | 'en');
          setCurrentLocationName(locationName);
          
          // Save location to database for live tracking
          await saveLocationToDatabase(lat, lng, locationName);
        } catch (error) {
          // Fallback to coordinates if geocoding fails (e.g., API unavailable)
          console.warn('Geocoding failed, using coordinates:', error);
          setCurrentLocationName(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
        
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        const msg =
          error.code === error.PERMISSION_DENIED
            ? locale === 'ar'
              ? 'تم رفض إذن الوصول إلى الموقع.'
              : 'Location permission denied.'
            : locale === 'ar'
              ? 'تعذر الحصول على الموقع الحالي.'
              : 'Failed to get current location.';
        pushToast({ variant: 'error', title: titleFor('form'), message: msg });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Save location to database for live tracking
  const saveLocationToDatabase = async (lat: number, lng: number, address: string | null) => {
    try {
      await fetch('/api/location/update', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          timestamp: Date.now(),
          address,
        }),
      });
    } catch {
      // Silently fail - location is optional
    }
  };

  const locationDisplayValue = useCurrentLocation
    ? (currentLocationName || (coords ? `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}` : ''))
    : location;

  const submitNow = async (normalizedPhoneE164: string) => {
    const finalLocation = useCurrentLocation
      ? (currentLocationName || (coords ? `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}` : ''))
      : location;
    const payload = new FormData();
    if (isAdmin && name.trim()) payload.append('name', name.trim());
    if (destination) {
      payload.append('destination', destination);
      payload.append('placeOfBusiness', destination);
    }
    payload.append('description', description);
    if (finalLocation) payload.append('location', finalLocation);
    payload.append('phone', normalizedPhoneE164);
    payload.append('active', 'true');
    if (imageFile) payload.append('image', imageFile);

    setSubmitting(true);
    try {
      const res = await fetch('/api/providers', {
        method: 'POST',
        body: payload,
      });

      const data = await res.json().catch(() => null);

      if (res.status === 202 && data && typeof data === 'object' && (data as any).queued === true) {
        pushToast({
          variant: 'info',
          title: titleFor('success'),
          message:
            locale === 'ar'
              ? 'تم حفظ البيانات بدون اتصال وسيتم المزامنة تلقائياً عند عودة الإنترنت.'
              : 'Saved offline. It will sync automatically when you are back online.',
        });
        return;
      }

      if (!res.ok) {
        const code = data?.error;
        if (code === 'OFFLINE_QUEUE_FULL') {
          const maxBytes = typeof data?.maxBytes === 'number' ? data.maxBytes : null;
          const limit = maxBytes ? ` (${Math.round(maxBytes / 1024 / 1024)}MB limit)` : '';
          pushToast({
            variant: 'error',
            title: titleFor('network'),
            message:
              locale === 'ar'
                ? `سعة التخزين دون اتصال ممتلئة${limit}. يرجى الاتصال بالإنترنت للمزامنة أو تقليل حجم الصور ثم المحاولة مرة أخرى.`
                : `Offline queue is full${limit}. Please go online to sync, or reduce image size and try again.`,
          });
        } else if (code === 'IMAGE_TOO_LARGE') {
          const maxBytes = typeof data?.maxBytes === 'number' ? data.maxBytes : MAX_PROVIDER_IMAGE_BYTES;
          pushToast({
            variant: 'error',
            title: titleFor('image'),
            message: imageTooLargeMessage(maxBytes),
          });
        } else if (code === 'PHONE_REQUIRED') {
          pushToast({ variant: 'error', title: titleFor('phone'), message: t('errors.phoneRequired') });
        } else if (code === 'PHONE_INVALID_CHARACTERS') {
          pushToast({ variant: 'error', title: titleFor('phone'), message: t('errors.phoneInvalidCharacters') });
        } else if (code === 'PHONE_INVALID_LENGTH' || code === 'PHONE_INVALID') {
          pushToast({ variant: 'error', title: titleFor('phone'), message: t('errors.phoneInvalidLength') });
        } else if (code === 'MISSING_REQUIRED_FIELDS') {
          pushToast({ variant: 'error', title: titleFor('form'), message: t('errors.missingRequiredFields') });
        } else {
          const extra =
            `HTTP ${res.status}` +
            (code ? ` | ${String(code)}` : '') +
            (data?.message ? ` | ${String(data.message)}` : '');
          pushToast({ variant: 'error', title: titleFor('server'), message: `${t('errors.publishFailed')} (${extra})` });
        }
        return;
      }

      pushToast({ variant: 'success', title: titleFor('success'), message: t('success') });

      try {
        void fetch('/api/providers/mine', { credentials: 'include' }).catch(() => null);
        window.dispatchEvent(new Event('saweg:warmup'));
      } catch {
        // ignore
      }

      router.push(`/${locale}`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      pushToast({ variant: 'error', title: titleFor('network'), message: `${t('errors.publishFailed')} (${msg})` });
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting) return;
    const result = validateForSubmit();
    if (!result.ok) return;
    setConfirmOpen(true);
  };

  return (
    <div className={styles.page}>
      {confirmOpen ? (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-label={locale === 'ar' ? 'تأكيد نشر العرض' : 'Confirm publish'}
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmOpen(false);
          }}
        >
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{locale === 'ar' ? 'راجع بيانات العرض قبل النشر' : 'Review before publishing'}</h2>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalRow}>
                <div className={styles.modalLabel}>{t('name')}</div>
                <div className={styles.modalValue}>{name || '-'}</div>
              </div>
              <div className={styles.modalRow}>
                <div className={styles.modalLabel}>{t('destination')}</div>
                <div className={styles.modalValue}>{destination || '-'}</div>
              </div>
              <div className={styles.modalRow}>
                <div className={styles.modalLabel}>{t('location')}</div>
                <div className={styles.modalValue}>{locationDisplayValue || '-'}</div>
              </div>
              <div className={styles.modalRow}>
                <div className={styles.modalLabel}>{t('phone')}</div>
                <div className={styles.modalValue} dir="ltr">
                  {phone || '-'}
                </div>
              </div>
              <div className={styles.modalRow}>
                <div className={styles.modalLabel}>{t('description')}</div>
                <div className={styles.modalValue}>{description || '-'}</div>
              </div>
              <div className={styles.modalRow}>
                <div className={styles.modalLabel}>{t('image')}</div>
                <div className={styles.modalValue}>
                  {confirmImageUrl ? <img className={styles.modalImagePreview} src={confirmImageUrl} alt={t('image')} /> : '-'}
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalButtonSecondary}
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
              >
                {locale === 'ar' ? 'تعديل' : 'Edit'}
              </button>
              <button
                type="button"
                className={styles.modalButton}
                onClick={async () => {
                  if (submitting) return;
                  const result = validateForSubmit();
                  if (!result.ok) return;
                  setConfirmOpen(false);
                  await submitNow(result.normalizedPhoneE164);
                }}
                disabled={submitting}
              >
                {submitting ? (locale === 'ar' ? 'جاري النشر...' : 'Publishing...') : locale === 'ar' ? 'تأكيد النشر' : 'Confirm & Publish'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {toasts.length ? (
        <div className={styles.toastContainer} aria-live="polite" aria-atomic="true">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`${styles.toast} ${
                toast.variant === 'error'
                  ? styles.toastError
                  : toast.variant === 'success'
                    ? styles.toastSuccess
                    : styles.toastInfo
              }`}
              role="status"
            >
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
          <Link className={styles.backArrowTop} href={`/${locale}`} aria-label={locale === 'ar' ? 'رجوع' : 'Back'}>
            <ArrowRight size={24} />
          </Link>
          <h1 className={styles.title}>{t('title')}</h1>
        </div>

        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.row}>
            <label className={styles.label}>{t('name')}</label>
            <input
              className={styles.input}
              value={name}
              disabled={!isAdmin}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>{t('destination')}</label>
            <SearchableCitySelect
              value={destination}
              onChange={setDestination}
              locale={locale as 'ar' | 'en'}
              placeholder={locale === 'ar' ? 'ابحث عن مدينة...' : 'Search for a city...'}
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>{t('description')}</label>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>{t('location')}</label>
            {useCurrentLocation ? (
              <>
                <div className={styles.locationInfo}>
                  {isLocating ? (
                    <span className={styles.locationLoading}>
                      {locale === 'ar' ? 'جاري تحديد الموقع...' : 'Getting location...'}
                    </span>
                  ) : currentLocationName ? (
                    <span className={styles.locationCoords}>
                      {currentLocationName}
                    </span>
                  ) : coords ? (
                    <span className={styles.locationCoords}>
                      {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
                    </span>
                  ) : (
                    <span className={styles.locationError}>
                      {locale === 'ar' ? 'لم يتم تحديد الموقع' : 'Location not set'}
                    </span>
                  )}
                  <button
                    type="button"
                    className={styles.locationRefreshBtn}
                    onClick={getCurrentLocation}
                    disabled={isLocating}
                  >
                    {locale === 'ar' ? 'تحديث' : 'Refresh'}
                  </button>
                </div>
                <label className={styles.checkboxRow} style={{ marginTop: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={!useCurrentLocation}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setUseCurrentLocation(!checked);
                      if (!checked) {
                        setLocation('');
                        setCurrentLocationName(null);
                        getCurrentLocation();
                      } else {
                        setCoords(null);
                        setCurrentLocationName(null);
                      }
                    }}
                  />
                  <span>
                    {locale === 'ar' ? 'أو أدخل الموقع يدوياً' : 'Or enter location manually'}
                  </span>
                </label>
              </>
            ) : (
              <>
                <SearchableCitySelect
                  value={location}
                  onChange={setLocation}
                  locale={locale as 'ar' | 'en'}
                  placeholder={locale === 'ar' ? 'ابحث عن مدينة...' : 'Search for a city...'}
                />
                <label className={styles.checkboxRow} style={{ marginTop: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={useCurrentLocation}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setUseCurrentLocation(checked);
                      if (checked) {
                        setLocation('');
                        setCurrentLocationName(null);
                        getCurrentLocation();
                      } else {
                        setCoords(null);
                        setCurrentLocationName(null);
                      }
                    }}
                  />
                  <span>
                    {locale === 'ar' ? 'استخدام الموقع الحالي بدلاً من ذلك' : 'Use current location instead'}
                  </span>
                </label>
              </>
            )}
          </div>

          <div className={styles.row}>
            <label className={styles.label}>{t('phone')} </label>
            <input className={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>{t('image')}</label>
            <div className={styles.fileUploadWrapper}>
              <input
                className={styles.fileInputHidden}
                type="file"
                accept="image/*"
                id="provider-image-upload"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (file && file.size > MAX_PROVIDER_IMAGE_BYTES) {
                    setImageFile(null);
                    pushToast({
                      variant: 'error',
                      title: titleFor('image'),
                      message: imageTooLargeMessage(MAX_PROVIDER_IMAGE_BYTES),
                    });
                    return;
                  }
                  setImageFile(file);
                }}
                required
              />
              <label htmlFor="provider-image-upload" className={styles.fileUploadButton}>
                {locale === 'ar' ? 'اختيار ملف' : 'Choose file'}
              </label>
              <span className={styles.fileUploadText}>
                {imageFile ? imageFile.name : (locale === 'ar' ? 'لم يتم اختيار ملف' : 'No file chosen')}
              </span>
            </div>
          </div>

          <button className={styles.button} type="submit" disabled={submitting}>
            {submitting ? t('submitting') : t('submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
