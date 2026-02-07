'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './my-profile.module.css';
import { normalizePhoneNumber } from '@/lib/phone';
import { getLocationOptionGroups } from '@/lib/locations';
// Update the import statement to include new icons
import { Camera, Bell, Loader2, Check, AlertCircle } from 'lucide-react';

const CAR_KIND_OPTIONS: Array<{ value: string; imagePath: string }> = [
  { value: 'شاحنة صندوقية (Van / Box Truck)', imagePath: '/images/van_box_truck.png' },
  { value: 'شاحنة مسطحة (Flatbed Truck)', imagePath: '/images/flatbed_truck.png' },
  { value: 'شاحنة مبردة (Reefer Truck)', imagePath: '/images/reefer_truck.png' },
  { value: 'شاحنة قلابة (Dump Truck / Tipper)', imagePath: '/images/dump_truck_tipper.png' },
  { value: 'شاحنة مغطاة (Curtainsider)', imagePath: '/images/curtainsider.png' },
  { value: 'شاحنة صهريج (Tanker Truck)', imagePath: '/images/tanker_truck.png' },
  { value: 'شاحنة برافعة خلفية (Tail-lift Truck)', imagePath: '/images/tail_lift_truck.png' },
  { value: 'شاحنة رافعة (Crane Truck)', imagePath: '/images/crane_truck.png' },
  { value: 'شاحنة صندوقية بجوانب قابلة للطي (Drop-side Truck)', imagePath: '/images/drop_side_truck.png' },
  { value: 'شاحنة حاويات/شاسيه حامل حاويات (Container Truck)', imagePath: '/images/container_truck.png' },
  { value: 'شاحنة صهريج أغذية (Food Grade Tanker)', imagePath: '/images/food_grade_tranker.png' },
  { value: 'نصف مقطورة مجرورة(semi Trailer)', imagePath: '/images/semi_trailer.png' },
];
type User = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  type?: string | null;
  profileImage?: string | null;
  callsReceived?: number;
  merchantCity?: string | null;
  shipperCity?: string | null;
  carKind?: string | null;
  maxCharge?: string | null;
  maxChargeUnit?: string | null;
  trucksNeeded?: string | null;
  placeOfBusiness?: string | null;
  truckImage?: string | null;
};

export default function MyProfilePage() {
  const t = useTranslations('profile');
  const tRegister = useTranslations('register');
  const locale = useLocale();
  const router = useRouter();

  const profileImageInputRef = useRef<HTMLInputElement | null>(null);
  const profileImagePreviewUrlRef = useRef<string | null>(null);
  const truckImagePreviewUrlRef = useRef<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [callsReceived, setCallsReceived] = useState(0);
  const [initialUser, setInitialUser] = useState<User | null>(null);

  const [merchantCity, setMerchantCity] = useState('');
  const [shipperCity, setShipperCity] = useState('');
  const [carKind, setCarKind] = useState('');
  const [maxCharge, setMaxCharge] = useState('');
  const [maxChargeUnit, setMaxChargeUnit] = useState('kg');
  const [placeOfBusiness, setPlaceOfBusiness] = useState('');
  const [trucksNeeded, setTrucksNeeded] = useState('');
  const [trucksNeededOpen, setTrucksNeededOpen] = useState(false);

  const selectedTrucksNeeded = CAR_KIND_OPTIONS.find((opt) => opt.value === trucksNeeded) ?? null;
  const [truckImage, setTruckImage] = useState<string | null>(null);
  const [truckImageFile, setTruckImageFile] = useState<File | null>(null);

  const [enablingPush, setEnablingPush] = useState(false);
  const [pushStatus, setPushStatus] = useState<'unknown' | 'enabled' | 'blocked' | 'not_supported'>('unknown');
  const [togglingPush, setTogglingPush] = useState(false);

  const getPushRegistration = async (): Promise<ServiceWorkerRegistration | null> => {
    if (typeof window === 'undefined') return null;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;

    const withTimeout = async <T,>(p: Promise<T>, ms: number): Promise<T> => {
      return await Promise.race([
        p,
        new Promise<T>((_, reject) => {
          window.setTimeout(() => reject(new Error('SW_TIMEOUT')), ms);
        }),
      ]);
    };

    const waitForActive = async (reg: ServiceWorkerRegistration) => {
      if (reg.active) return;
      const sw = reg.installing || reg.waiting;
      if (!sw) return;
      await withTimeout(
        new Promise<void>((resolve) => {
          const onState = () => {
            if (sw.state === 'activated' || sw.state === 'redundant') {
              sw.removeEventListener('statechange', onState);
              resolve();
            }
          };
          sw.addEventListener('statechange', onState);
          onState();
        }),
        5000
      ).catch(() => null);
    };

    try {
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      }
      await waitForActive(reg);
      return reg;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    return () => {
      if (profileImagePreviewUrlRef.current) {
        URL.revokeObjectURL(profileImagePreviewUrlRef.current);
        profileImagePreviewUrlRef.current = null;
      }

      if (truckImagePreviewUrlRef.current) {
        URL.revokeObjectURL(truckImagePreviewUrlRef.current);
        truckImagePreviewUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!trucksNeededOpen) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (!target.closest('[data-trucks-needed-root="true"]')) {
        setTrucksNeededOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTrucksNeededOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [trucksNeededOpen]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (cancelled) return;

        const user: User | null = data?.user ?? null;
        if (!user) {
          router.push(`/${locale}/login`);
          router.refresh();
          return;
        }

        setFullName(user.fullName ?? '');
        setEmail(user.email ?? '');
        setPhone(user.phone ?? '');
        setProfileImage(user.profileImage ?? null);
        setUserType(user.type ?? null);
        setCallsReceived(typeof (user as any).callsReceived === 'number' ? (user as any).callsReceived : 0);

        setMerchantCity(user.merchantCity ?? '');
        setShipperCity(user.shipperCity ?? '');
        setCarKind(user.carKind ?? '');
        setMaxCharge(user.maxCharge ?? '');
        setMaxChargeUnit(user.maxChargeUnit ?? 'kg');
        setPlaceOfBusiness(user.placeOfBusiness ?? '');
        setTrucksNeeded(user.trucksNeeded ?? '');
        setTruckImage(user.truckImage ?? null);

        setInitialUser(user);

        if (
          typeof window !== 'undefined' &&
          'Notification' in window &&
          'serviceWorker' in navigator &&
          'PushManager' in window
        ) {
          const permission: NotificationPermission = Notification.permission;
          if (permission === 'denied') {
            setPushStatus('blocked');
          } else if (permission === 'granted') {
            try {
              const reg = await navigator.serviceWorker.getRegistration();
              const existing = reg ? await reg.pushManager.getSubscription() : null;
              if (existing) {
                setPushStatus('enabled');
                await fetch('/api/push/subscribe', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify(existing),
                }).catch(() => null);
              } else {
                setPushStatus('unknown');
              }
            } catch {
              setPushStatus('unknown');
            }
          } else {
            setPushStatus('unknown');
          }
        }
      } catch {
        if (cancelled) return;
        setError(t('loadFailed'));
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };

    load();

    const onOnline = () => {
      if (cancelled) return;
      void load();
    };

    window.addEventListener('online', onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
    };
  }, [locale]);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const enablePushNotifications = async () => {
    setEnablingPush(true);
    setError(null);

    try {
      if (!('Notification' in window)) {
        setPushStatus('not_supported');
        setError(locale === 'ar' ? 'المتصفح لا يدعم الإشعارات.' : 'This browser does not support notifications.');
        return;
      }

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPushStatus('not_supported');
        setError(locale === 'ar' ? 'المتصفح لا يدعم Push.' : 'Push is not supported in this browser.');
        return;
      }

      let permission: NotificationPermission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission !== 'granted') {
        setPushStatus(permission === 'denied' ? 'blocked' : 'unknown');
        setError(
          locale === 'ar'
            ? permission === 'denied'
              ? 'تم رفض الإذن للإشعارات.'
              : 'يرجى السماح بالإشعارات من إعدادات المتصفح.'
            : permission === 'denied'
              ? 'Notification permission was denied.'
              : 'Please allow notifications in your browser settings.'
        );
        return;
      }

      const reg = await getPushRegistration();
      if (!reg) {
        setPushStatus('not_supported');
        return;
      }
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        const saveRes = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(existing),
        });
        const saveData = await saveRes.json().catch(() => null);
        if (!saveRes.ok) {
          setError(
            locale === 'ar'
              ? (typeof saveData?.error === 'string' ? saveData.error : 'فشل حفظ الاشتراك.')
              : (typeof saveData?.error === 'string' ? saveData.error : 'Failed to save subscription.')
          );
          return;
        }

        setPushStatus('enabled');
        setSuccess(true);
        return;
      }

      const keyRes = await fetch('/api/push/public-key', { cache: 'no-store' });
      const keyData = await keyRes.json().catch(() => null);
      if (!keyRes.ok || !keyData?.publicKey) {
        setError(locale === 'ar' ? 'فشل إعداد مفاتيح الإشعارات.' : 'Failed to load push keys.');
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(String(keyData.publicKey)),
      });

      const saveRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(sub),
      });
      const saveData = await saveRes.json().catch(() => null);
      if (!saveRes.ok) {
        setError(
          locale === 'ar'
            ? (typeof saveData?.error === 'string' ? saveData.error : 'فشل حفظ الاشتراك.')
            : (typeof saveData?.error === 'string' ? saveData.error : 'Failed to save subscription.')
        );
        return;
      }

      setPushStatus('enabled');
      setSuccess(true);
    } catch {
      setError(locale === 'ar' ? 'فشل تفعيل الإشعارات.' : 'Failed to enable notifications.');
    } finally {
      setEnablingPush(false);
    }
  };

  const disablePushNotifications = async () => {
    if (togglingPush) return;
    setTogglingPush(true);
    setError(null);

    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPushStatus('not_supported');
        return;
      }

      const reg = await navigator.serviceWorker.getRegistration();
      const existing = reg ? await reg.pushManager.getSubscription() : null;
      if (!existing) {
        setPushStatus('unknown');
        return;
      }

      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ endpoint: existing.endpoint }),
      }).catch(() => null);

      await existing.unsubscribe().catch(() => null);
      setPushStatus('unknown');
    } catch {
      setError(locale === 'ar' ? 'فشل إلغاء تفعيل الإشعارات.' : 'Failed to disable notifications.');
    } finally {
      setTogglingPush(false);
    }
  };

  const onProfileImageChange = (file: File | null) => {
    setProfileImageFile(file);

    if (profileImagePreviewUrlRef.current) {
      URL.revokeObjectURL(profileImagePreviewUrlRef.current);
      profileImagePreviewUrlRef.current = null;
    }

    if (file) {
      const previewUrl = URL.createObjectURL(file);
      profileImagePreviewUrlRef.current = previewUrl;
      setProfileImage(previewUrl);
    }
  };

  const onTruckImageChange = (file: File | null) => {
    setTruckImageFile(file);

    if (truckImagePreviewUrlRef.current) {
      URL.revokeObjectURL(truckImagePreviewUrlRef.current);
      truckImagePreviewUrlRef.current = null;
    }

    if (file) {
      const previewUrl = URL.createObjectURL(file);
      truckImagePreviewUrlRef.current = previewUrl;
      setTruckImage(previewUrl);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!initialUser) {
      setError(t('loadFailed'));
      return;
    }

    const fullNameTrimmed = fullName.trim();
    const emailTrimmed = email.trim();
    const emailNormalized = emailTrimmed ? emailTrimmed.toLowerCase() : '';
    const phoneTrimmed = phone.trim();

    const initialFullName = (initialUser.fullName ?? '').trim();
    const initialEmail = (initialUser.email ?? '').trim().toLowerCase();
    const initialPhone = (initialUser.phone ?? '').trim();

    const fullNameChanged = fullNameTrimmed !== initialFullName;
    const emailChanged = emailNormalized !== initialEmail;
    const phoneChanged = phoneTrimmed !== initialPhone;

    const normalizedPhone = phoneChanged && phoneTrimmed ? normalizePhoneNumber(phoneTrimmed) : null;
    if (normalizedPhone && !normalizedPhone.ok) {
      if (normalizedPhone.error === 'PHONE_REQUIRED') {
        setError(t('phoneRequired'));
      } else if (normalizedPhone.error === 'PHONE_INVALID_CHARACTERS') {
        setError(t('phoneInvalidCharacters'));
      } else {
        setError(t('phoneInvalidLength'));
      }
      return;
    }

    const nextFullName = fullNameChanged ? fullNameTrimmed : initialFullName;
    const nextEmail = emailChanged ? (emailNormalized ? emailNormalized : '') : initialEmail;
    const nextPhone = phoneChanged
      ? normalizedPhone && normalizedPhone.ok
        ? normalizedPhone.e164
        : phoneTrimmed
      : initialPhone;

    if (!nextFullName) {
      setError(t('fullNameRequired'));
      return;
    }

    if (!nextEmail && !nextPhone) {
      setError(t('emailOrPhoneRequired'));
      return;
    }

    const merchantCityChanged = merchantCity.trim() !== (initialUser.merchantCity ?? '').trim();
    const placeOfBusinessChanged = placeOfBusiness.trim() !== (initialUser.placeOfBusiness ?? '').trim();
    const trucksNeededChanged = trucksNeeded.trim() !== (initialUser.trucksNeeded ?? '').trim();

    const shipperCityChanged = shipperCity.trim() !== (initialUser.shipperCity ?? '').trim();
    const carKindChanged = carKind.trim() !== (initialUser.carKind ?? '').trim();
    const maxChargeChanged = maxCharge.trim() !== (initialUser.maxCharge ?? '').trim();
    const maxChargeUnitChanged = maxChargeUnit !== (initialUser.maxChargeUnit ?? 'kg');

    const hasAnyChange =
      fullNameChanged ||
      emailChanged ||
      phoneChanged ||
      Boolean(profileImageFile) ||
      Boolean(truckImageFile) ||
      (userType === 'MERCHANT' && (merchantCityChanged || placeOfBusinessChanged || trucksNeededChanged)) ||
      (userType === 'SHIPPER' && (shipperCityChanged || carKindChanged || maxChargeChanged || maxChargeUnitChanged));

    if (!hasAnyChange) {
      setSuccess(true);
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      if (fullNameChanged) fd.append('fullName', fullNameTrimmed);
      if (emailChanged) fd.append('email', emailNormalized);
      if (phoneChanged) fd.append('phone', normalizedPhone && normalizedPhone.ok ? normalizedPhone.e164 : phoneTrimmed);
      if (profileImageFile) fd.append('profileImage', profileImageFile);

      if (userType === 'SHIPPER') {
        if (shipperCityChanged) fd.append('shipperCity', shipperCity.trim());
        if (carKindChanged) fd.append('carKind', carKind.trim());
        if (maxChargeChanged) fd.append('maxCharge', maxCharge.trim());
        if (maxChargeUnitChanged) fd.append('maxChargeUnit', maxChargeUnit);
        if (truckImageFile) fd.append('truckImage', truckImageFile);
      }

      if (userType === 'MERCHANT') {
        if (merchantCityChanged) fd.append('merchantCity', merchantCity.trim());
        if (placeOfBusinessChanged) fd.append('placeOfBusiness', placeOfBusiness.trim());
        if (trucksNeededChanged) fd.append('trucksNeeded', trucksNeeded.trim());
      }

      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        body: fd,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        const code = data?.error;
        if (code === 'DUPLICATE_EMAIL') {
          setError(t('duplicateEmail'));
        } else if (code === 'DUPLICATE_PHONE') {
          setError(t('duplicatePhone'));
        } else if (code === 'DUPLICATE_IDENTIFIER') {
          setError(t('duplicateIdentifier'));
        } else if (code === 'PHONE_REQUIRED') {
          setError(t('phoneRequired'));
        } else if (code === 'PHONE_INVALID_CHARACTERS') {
          setError(t('phoneInvalidCharacters'));
        } else if (code === 'PHONE_INVALID_LENGTH' || code === 'PHONE_INVALID') {
          setError(t('phoneInvalidLength'));
        } else if (code === 'FULL_NAME_REQUIRED') {
          setError(t('fullNameRequired'));
        } else if (code === 'EMAIL_OR_PHONE_REQUIRED') {
          setError(t('emailOrPhoneRequired'));
        } else {
          setError(t('saveFailed'));
        }
        return;
      }

      setSuccess(true);
      if (data?.user?.profileImage !== undefined) {
        setProfileImage(data.user.profileImage ?? null);
        setProfileImageFile(null);
      }
      if (data?.user?.truckImage !== undefined) {
        setTruckImage(data.user.truckImage ?? null);
        setTruckImageFile(null);
      }

      setInitialUser((prev) => ({
        ...(prev ?? initialUser),
        ...(data?.user ?? {}),
      }));
      router.refresh();
    } catch {
      setError(t('saveFailed'));
    } finally {
      setSaving(false);
    }
  };

 // page.tsx - Updated section (replace from line 400 to 530 approximately)

// ... existing imports and code ...

return (
  <div className={styles.page}>
    <div className={styles.card}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('title')}</h1>
      </div>

      {loading ? (
        <div className={styles.loading}>{t('loading')}</div>
      ) : (
        <form className={styles.form} onSubmit={onSubmit}>
          {(userType === 'SHIPPER' || userType === 'ADMIN') && (
            <div className={styles.pushRow}>
              <div className={styles.pushHeader}>
                <Bell className={styles.pushIcon} size={18} />
                <h3 className={styles.pushTitle}>{locale === 'ar' ? 'الإشعارات' : 'Notifications'}</h3>
              </div>

              <p className={styles.pushDescription}>
                {locale === 'ar'
                  ? 'احصل على إشعارات فورية عند وجود عروض جديدة تناسبك'
                  : 'Get instant notifications when new offers match your criteria'}
              </p>

              {pushStatus === 'blocked' ? (
                <p className={styles.error} style={{ fontSize: '12px', marginTop: '8px' }}>
                  {locale === 'ar'
                    ? 'يجب السماح بالإشعارات من إعدادات المتصفح أولاً'
                    : 'Please allow notifications from browser settings first'}
                </p>
              ) : null}

              <div className={styles.pushToggleRow}>
                <label className={styles.pushToggleLabel}>
                  <span>{locale === 'ar' ? 'تفعيل الإشعارات' : 'Enable notifications'}</span>
                  <input
                    className={styles.pushToggleInput}
                    type="checkbox"
                    checked={pushStatus === 'enabled'}
                    disabled={enablingPush || togglingPush || pushStatus === 'blocked' || pushStatus === 'not_supported'}
                    onChange={(e) => {
                      const next = e.target.checked;
                      if (next) {
                        void enablePushNotifications();
                      } else {
                        void disablePushNotifications();
                      }
                    }}
                  />
                  <span className={styles.pushToggleSwitch} aria-hidden="true" />
                </label>

                {(enablingPush || togglingPush) && (
                  <div className={styles.pushToggleLoading}>
                    <Loader2 size={16} className="animate-spin" />
                    {locale === 'ar' ? 'جارِ التحديث...' : 'Updating...'}
                  </div>
                )}
              </div>

              {pushStatus === 'enabled' ? (
                <div className={`${styles.pushStatus} ${styles.enabled}`}>
                  <span>
                    <Check size={14} /> {locale === 'ar' ? 'مفعّل' : 'Enabled'}
                  </span>
                </div>
              ) : null}
            </div>
          )}

          {/* Avatar Section */}
          <div className={styles.avatarRow}>
            <div className={styles.avatarWrapper}>
              {profileImage ? (
                <img className={styles.avatar} src={profileImage} alt={fullName} />
              ) : (
                <div className={styles.avatarPlaceholder} aria-hidden="true">
                  {(fullName || '?').trim().slice(0, 1).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                className={styles.avatarEditButton}
                onClick={() => profileImageInputRef.current?.click()}
                aria-label={t('profileImage')}
              >
                <Camera size={16} />
              </button>
              <input
                ref={profileImageInputRef}
                className={styles.avatarInput}
                type="file"
                accept="image/*"
                onChange={(e) => onProfileImageChange(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          {/* Basic Information */}
          <div className={styles.row}>
            <label className={styles.label}>{t('fullName')}</label>
            <input className={styles.input} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>{t('email')}</label>
            <input className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>{t('phone')}</label>
            <input className={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>{t('callsReceived')}</label>
            <input className={styles.input} value={String(callsReceived)} readOnly />
          </div>

          {/* Type-specific fields */}
          {userType === 'SHIPPER' ? (
            <>
              <div className={styles.row}>
                <label className={styles.label}>{tRegister('shipperCity')}</label>
                <input className={styles.input} value={shipperCity} onChange={(e) => setShipperCity(e.target.value)} />
              </div>

              <div className={styles.row}>
                <label className={styles.label}>{tRegister('carKind')}</label>
                <input className={styles.input} value={carKind} onChange={(e) => setCarKind(e.target.value)} />
              </div>

              <div className={styles.row}>
                <label className={styles.label}>{tRegister('maxCharge')}</label>
                <div className={styles.inlineRow}>
                  <input
                    className={styles.input}
                    value={maxCharge}
                    onChange={(e) => setMaxCharge(e.target.value)}
                    inputMode="decimal"
                  />
                  <select
                    className={styles.select}
                    value={maxChargeUnit}
                    onChange={(e) => setMaxChargeUnit(e.target.value)}
                  >
                    <option value="kg">kg</option>
                    <option value="ton">ton</option>
                  </select>
                </div>
              </div>

              <div className={styles.row}>
                <label className={styles.label}>{tRegister('truckImage')}</label>
                {truckImage ? <img className={styles.truckImagePreview} src={truckImage} alt={tRegister('truckImage')} /> : null}
                <input
                  className={styles.fileInput}
                  type="file"
                  accept="image/*"
                  onChange={(e) => onTruckImageChange(e.target.files?.[0] ?? null)}
                />
              </div>
            </>
          ) : null}

          {userType === 'MERCHANT' ? (
            <>
              <div className={styles.row}>
                <label className={styles.label}>{tRegister('merchantCity')}</label>
                <select
                  className={styles.input}
                  value={merchantCity}
                  onChange={(e) => setMerchantCity(e.target.value)}
                >
                  <option value="">
                    {locale === 'ar' ? 'اختر مدينتك' : 'Choose your city'}
                  </option>
                  {getLocationOptionGroups(locale === 'ar' ? 'ar' : 'en').map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className={styles.row}>
                <label className={styles.label}>{tRegister('placeOfBusiness')}</label>
                <input
                  className={styles.input}
                  value={placeOfBusiness}
                  onChange={(e) => setPlaceOfBusiness(e.target.value)}
                />
              </div>

              <div className={styles.row}>
                <label className={styles.label}>{tRegister('trucksNeeded')}</label>
                <div className={styles.carKindRoot} data-trucks-needed-root="true">
                  <button
                    type="button"
                    className={`${styles.input} ${styles.carKindButton}`}
                    aria-haspopup="listbox"
                    aria-expanded={trucksNeededOpen ? 'true' : 'false'}
                    onClick={() => setTrucksNeededOpen((v) => !v)}
                  >
                    {selectedTrucksNeeded ? (
                      <span className={styles.carKindButtonInner}>
                        <img
                          src={selectedTrucksNeeded.imagePath}
                          alt={selectedTrucksNeeded.value}
                          className={styles.carKindThumb}
                          loading="lazy"
                        />
                        <span className={styles.carKindButtonLabel}>{selectedTrucksNeeded.value}</span>
                      </span>
                    ) : (
                      <span className={styles.carKindPlaceholder}>
                        {locale === 'ar' ? 'اختر نوع الشاحنة' : 'Choose truck type'}
                      </span>
                    )}
                  </button>

                  {trucksNeededOpen ? (
                    <div className={styles.carKindPopover} role="listbox">
                      {CAR_KIND_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={styles.carKindOption}
                          role="option"
                          aria-selected={opt.value === trucksNeeded ? 'true' : 'false'}
                          onClick={() => {
                            setTrucksNeeded(opt.value);
                            setTrucksNeededOpen(false);
                          }}
                        >
                          <img
                            src={opt.imagePath}
                            alt={opt.value}
                            className={styles.carKindOptionThumb}
                            loading="lazy"
                          />
                          <span className={styles.carKindOptionLabel}>{opt.value}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}

          {/* Status Messages */}
          {error ? <div className={styles.error}>{error}</div> : null}
          {success ? <div className={styles.success}>{t('saved')}</div> : null}

          {/* Save Button */}
          <button className={styles.button} type="submit" disabled={saving}>
            {saving ? t('saving') : t('save')}
          </button>

          {/* Footer Link */}
          <div className={styles.footer}>
            <Link className={styles.link} href={`/${locale}`}>
              {t('back')}
            </Link>
          </div>
        </form>
      )}
    </div>
  </div>
);
}
