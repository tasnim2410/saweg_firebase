'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from '../add-provider/add-provider.module.css';
import { getLocationOptionGroups } from '@/lib/locations';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

type WeightUnit = 'kg' | 'ton';

export default function AddMerchantGoodsPostPage() {
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
  const [startingPoint, setStartingPoint] = useState('');
  const [destination, setDestination] = useState('');
  const [goodsType, setGoodsType] = useState('');
  const [goodsWeight, setGoodsWeight] = useState<string>('');
  const [goodsWeightUnit, setGoodsWeightUnit] = useState<WeightUnit>('kg');
  const [loadingDate, setLoadingDate] = useState('');
  const [vehicleTypeDesired, setVehicleTypeDesired] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const pushToast = (toast: { variant: 'error' | 'success' | 'info'; title: string; message: string }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [{ id, ...toast }, ...prev]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((tItem) => tItem.id !== id));
    }, 5000);
  };

  const titleFor = (kind: 'image' | 'form' | 'server' | 'network' | 'success') => {
    if (locale === 'ar') {
      if (kind === 'image') return 'خطأ في الصورة';
      if (kind === 'form') return 'خطأ في النموذج';
      if (kind === 'network') return 'خطأ في الاتصال';
      if (kind === 'success') return 'تم بنجاح';
      return 'خطأ في الخادم';
    }

    if (kind === 'image') return 'Image error';
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

        if (!admin && type !== 'MERCHANT' && type !== 'ADMIN') {
          router.push(`/${locale}`);
          router.refresh();
          return;
        }

        const fullName = data?.user?.fullName;
        if (typeof fullName === 'string') setName(fullName);
      } catch {
        if (cancelled) return;
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (imageFile && imageFile.size > MAX_IMAGE_BYTES) {
      pushToast({ variant: 'error', title: titleFor('image'), message: imageTooLargeMessage(MAX_IMAGE_BYTES) });
      return;
    }

    if (
      !startingPoint.trim() ||
      !destination.trim() ||
      !goodsType.trim() ||
      !goodsWeight.trim() ||
      !loadingDate.trim() ||
      !vehicleTypeDesired.trim()
    ) {
      pushToast({
        variant: 'error',
        title: titleFor('form'),
        message: locale === 'ar' ? 'يرجى إدخال كل الحقول المطلوبة' : 'Please fill all required fields',
      });
      return;
    }

    const weightNum = Number(goodsWeight);
    if (!Number.isFinite(weightNum) || weightNum <= 0) {
      pushToast({
        variant: 'error',
        title: titleFor('form'),
        message: locale === 'ar' ? 'الوزن غير صحيح' : 'Invalid weight',
      });
      return;
    }

    const payload = new FormData();
    if (isAdmin && name.trim()) payload.append('name', name.trim());
    payload.append('startingPoint', startingPoint);
    payload.append('destination', destination);
    payload.append('goodsType', goodsType);
    payload.append('goodsWeight', String(weightNum));
    payload.append('goodsWeightUnit', goodsWeightUnit);
    payload.append('loadingDate', loadingDate);
    payload.append('vehicleTypeDesired', vehicleTypeDesired);
    if (description.trim()) payload.append('description', description);
    if (imageFile) payload.append('image', imageFile);

    setSubmitting(true);
    try {
      const res = await fetch('/api/merchant-goods-posts', {
        method: 'POST',
        body: payload,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const code = data?.error;
        if (code === 'IMAGE_TOO_LARGE') {
          const maxBytes = typeof data?.maxBytes === 'number' ? data.maxBytes : MAX_IMAGE_BYTES;
          pushToast({ variant: 'error', title: titleFor('image'), message: imageTooLargeMessage(maxBytes) });
        } else {
          pushToast({
            variant: 'error',
            title: titleFor('server'),
            message: locale === 'ar' ? 'فشل نشر الطلب' : 'Failed to publish post',
          });
        }
        return;
      }

      pushToast({
        variant: 'success',
        title: titleFor('success'),
        message: locale === 'ar' ? 'تم نشر الطلب بنجاح' : 'Post published successfully',
      });
      router.push(`/${locale}`);
      router.refresh();
    } catch {
      pushToast({
        variant: 'error',
        title: titleFor('network'),
        message: locale === 'ar' ? 'فشل نشر الطلب' : 'Failed to publish post',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
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
          <h1 className={styles.title}>{locale === 'ar' ? 'إضافة طلب تاجر' : 'Add merchant request'}</h1>
        </div>

        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.row}>
            <label className={styles.label}>{locale === 'ar' ? 'الاسم' : 'Name'}</label>
            <input
              className={styles.input}
              value={name}
              disabled={!isAdmin}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>{locale === 'ar' ? 'نقطة البداية' : 'Starting point'}</label>
            <select
              className={styles.input}
              value={startingPoint}
              onChange={(e) => setStartingPoint(e.target.value)}
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
            <label className={styles.label}>{locale === 'ar' ? 'الوجهة' : 'Destination'}</label>
            <select className={styles.input} value={destination} onChange={(e) => setDestination(e.target.value)} required>
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
            <label className={styles.label}>{locale === 'ar' ? 'نوع البضاعة' : 'Type of goods'}</label>
            <input className={styles.input} value={goodsType} onChange={(e) => setGoodsType(e.target.value)} required />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>{locale === 'ar' ? 'وزن البضاعة' : 'Goods weight'}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className={styles.input}
                type="number"
                value={goodsWeight}
                onChange={(e) => setGoodsWeight(e.target.value)}
                min={0}
                step={0.1}
                required
              />
              <select
                className={styles.input}
                value={goodsWeightUnit}
                onChange={(e) => setGoodsWeightUnit(e.target.value as WeightUnit)}
              >
                <option value="kg">kg</option>
                <option value="ton">ton</option>
              </select>
            </div>
          </div>

          <div className={styles.row}>
            <label className={styles.label}>{locale === 'ar' ? 'تاريخ التحميل' : 'Loading date'}</label>
            <input
              className={styles.input}
              type="date"
              value={loadingDate}
              onChange={(e) => setLoadingDate(e.target.value)}
              required
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>{locale === 'ar' ? 'نوع المركبة المطلوبة' : 'Type of vehicle desired'}</label>
            <input
              className={styles.input}
              value={vehicleTypeDesired}
              onChange={(e) => setVehicleTypeDesired(e.target.value)}
              required
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>{locale === 'ar' ? 'الوصف (اختياري)' : 'Description (optional)'}</label>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>{locale === 'ar' ? 'صورة البضاعة (اختياري)' : 'Goods image (optional)'}</label>
            <input
              className={styles.file}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (file && file.size > MAX_IMAGE_BYTES) {
                  setImageFile(null);
                  pushToast({ variant: 'error', title: titleFor('image'), message: imageTooLargeMessage(MAX_IMAGE_BYTES) });
                  return;
                }
                setImageFile(file);
              }}
            />
          </div>

          <button className={styles.button} type="submit" disabled={submitting}>
            {submitting ? (locale === 'ar' ? 'جاري الإرسال...' : 'Submitting...') : locale === 'ar' ? 'نشر' : 'Publish'}
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
