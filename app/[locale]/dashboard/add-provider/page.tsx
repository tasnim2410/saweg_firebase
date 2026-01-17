'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './add-provider.module.css';
import { getLocationOptionGroups } from '@/lib/locations';
import { normalizePhoneNumber } from '@/lib/phone';

const MAX_PROVIDER_IMAGE_BYTES = 10 * 1024 * 1024;

export default function AddProviderPage() {
  const t = useTranslations('providerForm');
  const locale = useLocale();
  const router = useRouter();

  const locationOptionGroups = getLocationOptionGroups(locale === 'ar' ? 'ar' : 'en');

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
  const [destination, setDestination] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmImageUrl, setConfirmImageUrl] = useState<string | null>(null);

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

  const validateForSubmit = () => {
    if (imageFile && imageFile.size > MAX_PROVIDER_IMAGE_BYTES) {
      pushToast({
        variant: 'error',
        title: titleFor('image'),
        message: imageTooLargeMessage(MAX_PROVIDER_IMAGE_BYTES),
      });
      return { ok: false as const };
    }

    if (!location.trim() || !phone.trim()) {
      pushToast({
        variant: 'error',
        title: titleFor('form'),
        message: t('errors.missingRequiredFields'),
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

  const submitNow = async (normalizedPhoneE164: string) => {
    const payload = new FormData();
    if (isAdmin && name.trim()) payload.append('name', name.trim());
    payload.append('destination', destination);
    payload.append('placeOfBusiness', destination);
    payload.append('description', description);
    payload.append('location', location);
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

      if (!res.ok) {
        const code = data?.error;
        if (code === 'IMAGE_TOO_LARGE') {
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
          pushToast({ variant: 'error', title: titleFor('server'), message: t('errors.publishFailed') });
        }
        return;
      }

      pushToast({ variant: 'success', title: titleFor('success'), message: t('success') });
      router.push(`/${locale}`);
      router.refresh();
    } catch {
      pushToast({ variant: 'error', title: titleFor('network'), message: t('errors.publishFailed') });
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
                <div className={styles.modalValue}>{location || '-'}</div>
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
            <select
              className={styles.input}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            
            >
              <option value="" />
              {locationOptionGroups.map((group) => (
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
            <label className={styles.label}>{t('description')}</label>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>{t('location')}</label>
            <select
              className={styles.input}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            >
              <option value="" />
              {locationOptionGroups.map((group) => (
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
            <label className={styles.label}>{t('phone')} </label>
            <input className={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>{t('image')}</label>
            <input
              className={styles.file}
              type="file"
              accept="image/*"
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
          </div>

          <button className={styles.button} type="submit" disabled={submitting}>
            {submitting ? t('submitting') : t('submit')}
          </button>

          <div className={styles.footer}>
            <Link className={styles.link} href={`/${locale}`}>
              Back
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
