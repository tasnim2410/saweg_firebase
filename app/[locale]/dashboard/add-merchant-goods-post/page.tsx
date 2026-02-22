'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from '../add-provider/add-provider.module.css';
import { normalizePhoneNumber } from '@/lib/phone';
import { VEHICLE_TYPE_CONFIG, getVehicleLabel, isValidVehicleType, normalizeVehicleType, type VehicleTypeId } from '@/lib/vehicleTypes';
import SearchableCitySelect from '@/components/SearchableCitySelect';
import { ArrowLeft } from 'lucide-react';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

type WeightUnit = 'kg' | 'ton';

export default function AddMerchantGoodsPostPage() {
  const locale = useLocale();
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [phone, setPhone] = useState<string>('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmImageUrl, setConfirmImageUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const [toasts, setToasts] = useState<
    Array<{
      id: string;
      variant: 'error' | 'success' | 'info';
      title: string;
      message: string;
    }>
  >([]);

  const [name, setName] = useState('');
  const [startingPoint, setStartingPoint] = useState<string | null>(null);
  const [destination, setDestination] = useState<string | null>(null);
  const [goodsType, setGoodsType] = useState('');
  const [goodsWeight, setGoodsWeight] = useState<string>('');
  const [goodsWeightUnit, setGoodsWeightUnit] = useState<WeightUnit>('kg');
  const [budget, setBudget] = useState<string>('');
  const [budgetCurrency, setBudgetCurrency] = useState<string>('LYD');
  const [loadingDate, setLoadingDate] = useState('');
  const [vehicleTypeDesired, setVehicleTypeDesired] = useState('');
  const [customVehicleType, setCustomVehicleType] = useState('');
  const [vehicleTypeOpen, setVehicleTypeOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const selectedVehicleType = VEHICLE_TYPE_CONFIG.find((opt) => opt.id === vehicleTypeDesired) ?? null;

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
    setMounted(true);
  }, []);

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

        const phoneValue = typeof data?.user?.phone === 'string' ? data.user.phone : '';
        setPhone(phoneValue);

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

  useEffect(() => {
    if (!vehicleTypeOpen) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (!target.closest('[data-vehicle-type-root="true"]')) {
        setVehicleTypeOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVehicleTypeOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [vehicleTypeOpen]);

  const validateForSubmit = () => {
    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone.ok) {
      if (normalizedPhone.error === 'PHONE_REQUIRED') {
        pushToast({
          variant: 'error',
          title: titleFor('phone'),
          message: locale === 'ar' ? 'يرجى إدخال رقم الهاتف' : 'Phone number is required',
        });
      } else if (normalizedPhone.error === 'PHONE_INVALID_CHARACTERS') {
        pushToast({
          variant: 'error',
          title: titleFor('phone'),
          message: locale === 'ar' ? 'رقم الهاتف يحتوي على رموز غير صالحة' : 'Phone number contains invalid characters',
        });
      } else {
        pushToast({
          variant: 'error',
          title: titleFor('phone'),
          message: locale === 'ar' ? 'طول رقم الهاتف غير صحيح' : 'Invalid phone number length',
        });
      }
      return { ok: false as const };
    }

    if (imageFile && imageFile.size > MAX_IMAGE_BYTES) {
      pushToast({ variant: 'error', title: titleFor('image'), message: imageTooLargeMessage(MAX_IMAGE_BYTES) });
      return { ok: false as const };
    }

    // Validate description is required
    if (!description.trim()) {
      pushToast({
        variant: 'error',
        title: titleFor('form'),
        message: locale === 'ar' ? 'يرجى إدخال الوصف' : 'Description is required',
      });
      return { ok: false as const };
    }

    // Validate weight only if provided
    let weightNum: number | null = null;
    if (goodsWeight.trim()) {
      const parsedWeight = Number(goodsWeight);
      if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
        pushToast({
          variant: 'error',
          title: titleFor('form'),
          message: locale === 'ar' ? 'الوزن غير صحيح' : 'Invalid weight',
        });
        return { ok: false as const };
      }
      weightNum = parsedWeight;
    }

    // Validate budget only if provided
    const trimmedBudget = (budget || '').trim();
    const trimmedCurrency = (budgetCurrency || '').trim();
    let budgetNum: number | null = null;
    if (trimmedBudget) {
      const parsedBudget = Number(trimmedBudget);
      if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
        pushToast({
          variant: 'error',
          title: titleFor('form'),
          message: locale === 'ar' ? 'الميزانية غير صحيحة' : 'Invalid budget',
        });
        return { ok: false as const };
      }
      if (!trimmedCurrency) {
        pushToast({
          variant: 'error',
          title: titleFor('form'),
          message: locale === 'ar' ? 'يرجى اختيار العملة' : 'Please choose a currency',
        });
        return { ok: false as const };
      }
      budgetNum = parsedBudget;
    }

    return {
      ok: true as const,
      normalizedPhoneE164: normalizedPhone.e164,
      weightNum,
      budgetNum,
      budgetCurrency: trimmedBudget ? trimmedCurrency : null,
    };
  };

  const submitNow = async (
    normalizedPhoneE164: string,
    weightNum: number | null,
    budgetNum: number | null,
    budgetCurrencyValue: string | null
  ) => {
    const payload = new FormData();
    if (isAdmin && name.trim()) payload.append('name', name.trim());
    payload.append('phone', normalizedPhoneE164);
    if (startingPoint && startingPoint.trim()) payload.append('startingPoint', startingPoint);
    if (destination && destination.trim()) payload.append('destination', destination);
    if (goodsType.trim()) payload.append('goodsType', goodsType);
    if (weightNum !== null) {
      payload.append('goodsWeight', String(weightNum));
      payload.append('goodsWeightUnit', goodsWeightUnit);
    }
    if (budgetNum !== null) {
      payload.append('budget', String(budgetNum));
      if (budgetCurrencyValue) payload.append('budgetCurrency', budgetCurrencyValue);
    }
    if (loadingDate) payload.append('loadingDate', loadingDate);
    const finalVehicleType = vehicleTypeDesired === 'other' && customVehicleType.trim()
      ? customVehicleType.trim()
      : vehicleTypeDesired;
    if (finalVehicleType) payload.append('vehicleTypeDesired', finalVehicleType);
    payload.append('description', description);
    if (imageFile) payload.append('image', imageFile);

    setSubmitting(true);
    try {
      const res = await fetch('/api/merchant-goods-posts', {
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
          const maxBytes = typeof data?.maxBytes === 'number' ? data.maxBytes : MAX_IMAGE_BYTES;
          pushToast({ variant: 'error', title: titleFor('image'), message: imageTooLargeMessage(maxBytes) });
        } else if (code === 'PHONE_REQUIRED') {
          pushToast({
            variant: 'error',
            title: titleFor('phone'),
            message: locale === 'ar' ? 'يرجى إدخال رقم الهاتف' : 'Phone number is required',
          });
        } else if (code === 'PHONE_INVALID_CHARACTERS') {
          pushToast({
            variant: 'error',
            title: titleFor('phone'),
            message: locale === 'ar' ? 'رقم الهاتف يحتوي على رموز غير صالحة' : 'Phone number contains invalid characters',
          });
        } else if (code === 'PHONE_INVALID_LENGTH' || code === 'PHONE_INVALID') {
          pushToast({
            variant: 'error',
            title: titleFor('phone'),
            message: locale === 'ar' ? 'طول رقم الهاتف غير صحيح' : 'Invalid phone number length',
          });
        } else {
          const extra =
            `HTTP ${res.status}` +
            (code ? ` | ${String(code)}` : '') +
            (data?.message ? ` | ${String(data.message)}` : '');
          pushToast({
            variant: 'error',
            title: titleFor('server'),
            message: `${locale === 'ar' ? 'فشل نشر الطلب' : 'Failed to publish post'} (${extra})`,
          });
        }
        return;
      }

      pushToast({
        variant: 'success',
        title: titleFor('success'),
        message: locale === 'ar' ? 'تم نشر الطلب بنجاح' : 'Post published successfully',
      });

      try {
        void fetch('/api/merchant-goods-posts', { credentials: 'include' }).catch(() => null);
        window.dispatchEvent(new Event('saweg:warmup'));
      } catch {
        // ignore
      }

      router.push(`/${locale}`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      pushToast({
        variant: 'error',
        title: titleFor('network'),
        message: `${locale === 'ar' ? 'فشل نشر الطلب' : 'Failed to publish post'} (${msg})`,
      });
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
          aria-label={locale === 'ar' ? 'تأكيد نشر الطلب' : 'Confirm publish'}
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmOpen(false);
          }}
        >
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{locale === 'ar' ? 'راجع بيانات الطلب قبل النشر' : 'Review before publishing'}</h2>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalRow}>
                <div className={styles.modalLabel}>{locale === 'ar' ? 'الاسم' : 'Name'}</div>
                <div className={styles.modalValue}>{name || '-'}</div>
              </div>
              <div className={styles.modalRow}>
                <div className={styles.modalLabel}>{locale === 'ar' ? 'رقم الهاتف' : 'Phone number'}</div>
                <div className={styles.modalValue} dir="ltr">
                  {phone || '-'}
                </div>
              </div>
              
              <div className={styles.modalRow}>
                <div className={styles.modalLabel}>{locale === 'ar' ? 'نقطة البداية' : 'Starting point'}</div>
                <div className={styles.modalValue}>{startingPoint || '-'}</div>
              </div>
              <div className={styles.modalRow}>
                <div className={styles.modalLabel}>{locale === 'ar' ? 'الوجهة' : 'Destination'}</div>
                <div className={styles.modalValue}>{destination || '-'}</div>
              </div>
              <div className={styles.modalRow}>
                <div className={styles.modalLabel}>{locale === 'ar' ? 'نوع البضاعة' : 'Type of goods'}</div>
                <div className={styles.modalValue}>{goodsType || '-'}</div>
              </div>
              <div className={styles.modalRow}>
                <div className={styles.modalLabel}>{locale === 'ar' ? 'وزن البضاعة' : 'Goods weight'}</div>
                <div className={styles.modalValue}>
                  {goodsWeight ? `${goodsWeight} ${goodsWeightUnit}` : '-'}
                </div>
              </div>
              <div className={styles.modalRow}>
                <div className={styles.modalLabel}>{locale === 'ar' ? 'الميزانية' : 'Budget'}</div>
                <div className={styles.modalValue}>
                  {budget.trim() ? `${budget.trim()}${budgetCurrency.trim() ? ` ${budgetCurrency.trim()}` : ''}` : '-'}
                </div>
              </div>
              {/* <div className={styles.modalRow}>
                <div className={styles.modalLabel}>{locale === 'ar' ? 'تاريخ التحميل' : 'Loading date'}</div>
                <div className={styles.modalValue}>{loadingDate || '-'}</div>
              </div> */}
              <div className={styles.modalRow}>
                <div className={styles.modalLabel}>{locale === 'ar' ? 'نوع المركبة المطلوبة' : 'Type of vehicle desired'}</div>
                <div className={styles.modalValue}>{vehicleTypeDesired === 'other' && customVehicleType ? customVehicleType : vehicleTypeDesired || '-'}</div>
              </div>
             
              <div className={styles.modalRow}>
                <div className={styles.modalLabel}>{locale === 'ar' ? 'الوصف' : 'Description'}</div>
                <div className={styles.modalValue}>{description || '-'}</div>
              </div>
              <div className={styles.modalRow}>
                <div className={styles.modalLabel}>{locale === 'ar' ? 'الصورة' : 'Image'}</div>
                <div className={styles.modalValue}>
                  {confirmImageUrl ? (
                    <img className={styles.modalImagePreview} src={confirmImageUrl} alt={locale === 'ar' ? 'الصورة' : 'Image'} />
                  ) : (
                    '-'
                  )}
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
                  await submitNow(result.normalizedPhoneE164, result.weightNum, result.budgetNum, result.budgetCurrency);
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
          <Link className={styles.backArrowTop} href={`/${locale}`} aria-label={locale === 'ar' ? 'رجوع' : 'Back'} style={{ marginInlineEnd: 'auto' }}>
            <ArrowLeft size={24} />
          </Link>
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
            />
          </div>
         

          <div className={styles.row}>
            <label className={styles.label}>{locale === 'ar' ? 'رقم الهاتف' : 'Phone number'}</label>
            <input
              className={styles.input}
              value={phone}
              dir="ltr"
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          
          <div className={styles.row}>
            <label className={styles.label}>{locale === 'ar' ? 'مكان التحميل' : 'Loading location'}</label>
            <SearchableCitySelect
              value={startingPoint}
              onChange={setStartingPoint}
              locale={locale as 'ar' | 'en'}
              placeholder={locale === 'ar' ? 'ابحث عن مدينة...' : 'Search for a city...'}
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>{locale === 'ar' ? 'مكان التنزيل' : 'Unloading location'}</label>
            <SearchableCitySelect
              value={destination}
              onChange={setDestination}
              locale={locale as 'ar' | 'en'}
              placeholder={locale === 'ar' ? 'ابحث عن مدينة...' : 'Search for a city...'}
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>{locale === 'ar' ? 'نوع البضاعة' : 'Type of goods'}</label>
            <input className={styles.input} value={goodsType} onChange={(e) => setGoodsType(e.target.value)} />
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
            <label className={styles.label}>{locale === 'ar' ? 'الميزانية (اختياري)' : 'Budget (optional)'}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className={styles.input}
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                min={0}
                step={0.1}
                placeholder={locale === 'ar' ? 'مثال: 500' : 'e.g. 500'}
              />
              <select
                className={styles.input}
                value={budgetCurrency}
                onChange={(e) => setBudgetCurrency(e.target.value)}
                aria-label={locale === 'ar' ? 'العملة' : 'Currency'}
              >
                <option value="">{locale === 'ar' ? 'العملة' : 'Currency'}</option>
                <option value="TND">{locale === 'ar' ? 'تونس (TND)' : 'Tunisia (TND)'}</option>
                <option value="LYD">{locale === 'ar' ? 'ليبيا (LYD)' : 'Libya (LYD)'}</option>
                <option value="EGP">{locale === 'ar' ? 'مصر (EGP)' : 'Egypt (EGP)'}</option>
              </select>
            </div>
          </div>

          {/* <div className={styles.row}>
            <label className={styles.label}>{locale === 'ar' ? 'تاريخ التحميل' : 'Loading date'}</label>
            <input
              className={styles.input}
              type="date"
              value={loadingDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setLoadingDate(e.target.value)}
            />
          </div> */}

          <div className={styles.row}>
            <label className={styles.label}>{locale === 'ar' ? 'نوع المركبة المطلوبة' : 'Type of vehicle desired'}</label>
            {mounted ? (
              <div className={styles.vehicleTypeRoot} data-vehicle-type-root="true">
                <button
                  type="button"
                  className={`${styles.input} ${styles.vehicleTypeButton}`}
                  aria-haspopup="listbox"
                  aria-expanded={vehicleTypeOpen ? 'true' : 'false'}
                  onClick={() => setVehicleTypeOpen((v) => !v)}
                >
                  {selectedVehicleType ? (
                    <span className={styles.vehicleTypeButtonInner}>
                      <img
                        src={selectedVehicleType.imagePath}
                        alt={getVehicleLabel(selectedVehicleType.id, locale === 'ar' ? 'ar' : 'en')}
                        className={styles.vehicleTypeThumb}
                        loading="lazy"
                      />
                      <span className={styles.vehicleTypeButtonLabel}>{getVehicleLabel(selectedVehicleType.id, locale === 'ar' ? 'ar' : 'en')}</span>
                    </span>
                  ) : (
                    <span className={styles.vehicleTypePlaceholder}>
                      {locale === 'ar' ? 'اختر نوع المركبة' : 'Choose vehicle type'}
                    </span>
                  )}
                </button>

                {vehicleTypeOpen ? (
                  <div className={styles.vehicleTypePopover} role="listbox">
                    {VEHICLE_TYPE_CONFIG.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={styles.vehicleTypeOption}
                        role="option"
                        aria-selected={opt.id === vehicleTypeDesired ? 'true' : 'false'}
                        onClick={() => {
                          setVehicleTypeDesired(opt.id);
                          if (opt.id !== 'other') setCustomVehicleType('');
                          setVehicleTypeOpen(false);
                        }}
                      >
                        <img
                          src={opt.imagePath}
                          alt={getVehicleLabel(opt.id, locale === 'ar' ? 'ar' : 'en')}
                          className={styles.vehicleTypeOptionThumb}
                          loading="lazy"
                        />
                        <span className={styles.vehicleTypeOptionLabel}>{getVehicleLabel(opt.id, locale === 'ar' ? 'ar' : 'en')}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <input className={styles.input} value={vehicleTypeDesired} readOnly />
            )}
            {vehicleTypeDesired === 'other' && (
              <div className={styles.row} style={{ marginTop: '0.5rem' }}>
                <input
                  className={styles.input}
                  value={customVehicleType}
                  onChange={(e) => setCustomVehicleType(e.target.value)}
                  placeholder={locale === 'ar' ? 'أدخل نوع المركبة' : 'Enter vehicle type'}
                />
              </div>
            )}
          </div>
         

          <div className={styles.row}>
            <label className={styles.label}>{locale === 'ar' ? 'الوصف' : 'Description'}</label>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
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
        </form>
      </div>
    </div>
  );
}
