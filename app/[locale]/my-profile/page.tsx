'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Camera } from 'lucide-react';
import styles from './my-profile.module.css';

type User = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  type?: string | null;
  profileImage?: string | null;
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

  const [merchantCity, setMerchantCity] = useState('');
  const [shipperCity, setShipperCity] = useState('');
  const [carKind, setCarKind] = useState('');
  const [maxCharge, setMaxCharge] = useState('');
  const [maxChargeUnit, setMaxChargeUnit] = useState('kg');
  const [placeOfBusiness, setPlaceOfBusiness] = useState('');
  const [trucksNeeded, setTrucksNeeded] = useState('');
  const [truckImage, setTruckImage] = useState<string | null>(null);
  const [truckImageFile, setTruckImageFile] = useState<File | null>(null);

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

        setMerchantCity(user.merchantCity ?? '');
        setShipperCity(user.shipperCity ?? '');
        setCarKind(user.carKind ?? '');
        setMaxCharge(user.maxCharge ?? '');
        setMaxChargeUnit(user.maxChargeUnit ?? 'kg');
        setPlaceOfBusiness(user.placeOfBusiness ?? '');
        setTrucksNeeded(user.trucksNeeded ?? '');
        setTruckImage(user.truckImage ?? null);
      } catch {
        if (cancelled) return;
        setError(t('loadFailed'));
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [locale, router, t]);

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

    if (!fullName.trim()) {
      setError(t('fullNameRequired'));
      return;
    }

    if (!email.trim() && !phone.trim()) {
      setError(t('emailOrPhoneRequired'));
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('fullName', fullName);
      fd.append('email', email);
      fd.append('phone', phone);
      if (profileImageFile) fd.append('profileImage', profileImageFile);

      if (userType === 'SHIPPER') {
        fd.append('shipperCity', shipperCity);
        fd.append('carKind', carKind);
        fd.append('maxCharge', maxCharge);
        fd.append('maxChargeUnit', maxChargeUnit);
        if (truckImageFile) fd.append('truckImage', truckImageFile);
      }

      if (userType === 'MERCHANT') {
        fd.append('merchantCity', merchantCity);
        fd.append('placeOfBusiness', placeOfBusiness);
        fd.append('trucksNeeded', trucksNeeded);
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
      router.refresh();
    } catch {
      setError(t('saveFailed'));
    } finally {
      setSaving(false);
    }
  };

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
                  <input className={styles.input} value={merchantCity} onChange={(e) => setMerchantCity(e.target.value)} />
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
                  <input className={styles.input} value={trucksNeeded} onChange={(e) => setTrucksNeeded(e.target.value)} />
                </div>
              </>
            ) : null}

            {error ? <div className={styles.error}>{error}</div> : null}
            {success ? <div className={styles.success}>{t('saved')}</div> : null}

            <button className={styles.button} type="submit" disabled={saving}>
              {saving ? t('saving') : t('save')}
            </button>

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
