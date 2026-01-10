'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import styles from '../my-providers/my-providers.module.css';
import { getLocationOptionGroups } from '@/lib/locations';

const MAX_PROVIDER_IMAGE_BYTES = 10 * 1024 * 1024;

type Provider = {
  id: number;
  name: string;
  location: string;
  phone: string;
  destination?: string | null;
  placeOfBusiness?: string | null;
  description: string | null;
  image: string | null;
  active: boolean;
  lastLocationUpdateAt: string;
  createdAt: string;
};

type ProviderEdits = {
  location: string;
  phone: string;
  destination: string;
  description: string;
  active: boolean;
  imageFile: File | null;
};

export default function MyPostsPage() {
  const locale = useLocale();
  const tDash = useTranslations('providerDashboard');
  const tForm = useTranslations('providerForm');

  const locationOptionGroups = getLocationOptionGroups(locale === 'ar' ? 'ar' : 'en');

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'shippers' | 'merchants'>('shippers');
  const [savingAll, setSavingAll] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [edits, setEdits] = useState<Record<number, ProviderEdits>>({});

  const [toasts, setToasts] = useState<
    Array<{
      id: string;
      variant: 'error' | 'success';
      title: string;
      message: string;
    }>
  >([]);

  const pushToast = (toast: { variant: 'error' | 'success'; title: string; message: string }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [{ id, ...toast }, ...prev]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((tItem) => tItem.id !== id));
    }, 5000);
  };

  const titleFor = (kind: 'form' | 'image' | 'server' | 'network' | 'success') => {
    if (locale === 'ar') {
      if (kind === 'form') return 'خطأ في النموذج';
      if (kind === 'image') return 'خطأ في الصورة';
      if (kind === 'network') return 'خطأ في الاتصال';
      if (kind === 'success') return 'تم بنجاح';
      return 'خطأ في الخادم';
    }
    if (kind === 'form') return 'Form error';
    if (kind === 'image') return 'Image error';
    if (kind === 'network') return 'Network error';
    if (kind === 'success') return 'Success';
    return 'Server error';
  };

  const refresh = async (nextMode: 'shippers' | 'merchants') => {
    setLoading(true);
    try {
      const res = await fetch(nextMode === 'merchants' ? '/api/merchant-posts/mine' : '/api/providers/mine');
      const data = await res.json();
      if (!res.ok) {
        pushToast({
          variant: 'error',
          title: titleFor('server'),
          message: typeof data?.error === 'string' ? data.error : (locale === 'ar' ? 'فشل التحميل' : 'Failed to load'),
        });
        return;
      }
      setProviders(data);
    } catch {
      pushToast({
        variant: 'error',
        title: titleFor('network'),
        message: locale === 'ar' ? 'فشل التحميل' : 'Failed to load',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        const type = data?.user?.type;
        const nextMode: 'shippers' | 'merchants' = type === 'MERCHANT' ? 'merchants' : 'shippers';
        setMode(nextMode);
        await refresh(nextMode);
      } catch {
        if (cancelled) return;
        setMode('shippers');
        await refresh('shippers');
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const next: Record<number, ProviderEdits> = {};
    for (const p of providers) {
      next[p.id] = {
        location: p.location,
        phone: p.phone,
        destination: (p.destination ?? p.placeOfBusiness) ?? '',
        description: p.description ?? '',
        active: p.active,
        imageFile: null,
      };
    }
    setEdits(next);
  }, [providers]);

  const byId = useMemo(() => {
    const map = new Map<number, Provider>();
    for (const p of providers) map.set(p.id, p);
    return map;
  }, [providers]);

  const buildUpdatePayload = (id: number) => {
    const original = byId.get(id);
    const current = edits[id];
    if (!original || !current) return null;

    const payload: Record<string, unknown> = {};

    const nextLocation = current.location.trim();
    const nextPhone = current.phone.trim();

    if (nextLocation && nextLocation !== original.location) payload.location = nextLocation;
    if (nextPhone && nextPhone !== original.phone) payload.phone = nextPhone;

    const dest = current.destination.trim();
    const originalDest = (original.destination ?? original.placeOfBusiness) ?? '';
    if (dest !== originalDest) payload.destination = dest || null;

    const desc = current.description.trim();
    if (desc !== (original.description ?? '')) payload.description = desc || null;

    if (!('location' in payload) && current.active !== original.active) {
      payload.active = current.active;
    }

    const hasImage = Boolean(current.imageFile);
    if (!hasImage && Object.keys(payload).length === 0) return null;

    return { payload, hasImage, imageFile: current.imageFile };
  };

  const saveAll = async () => {
    setSavingAll(true);

    try {
      const ids = providers.map((p) => p.id);

      for (const id of ids) {
        const result = buildUpdatePayload(id);
        if (!result) continue;

        const { payload, hasImage, imageFile } = result;

        if (hasImage && imageFile && imageFile.size > MAX_PROVIDER_IMAGE_BYTES) {
          const maxMb = Math.floor(MAX_PROVIDER_IMAGE_BYTES / (1024 * 1024));
          pushToast({
            variant: 'error',
            title: titleFor('image'),
            message: locale === 'ar' ? `حجم الصورة كبير جداً. الحد الأقصى ${maxMb}MB.` : `Image is too large. Max is ${maxMb}MB.`,
          });
          return;
        }

        const res = await fetch(
          mode === 'merchants' ? `/api/merchant-posts/${id}` : `/api/providers/${id}`,
          hasImage
            ? (() => {
                const fd = new FormData();
                for (const [key, value] of Object.entries(payload)) {
                  fd.append(key, value === null ? '' : String(value));
                }
                if (imageFile) fd.append('image', imageFile);
                return { method: 'PATCH', body: fd } as const;
              })()
            : {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(payload),
              }
        );

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const code = data?.error;
          if (code === 'IMAGE_TOO_LARGE') {
            const maxBytes = typeof data?.maxBytes === 'number' ? data.maxBytes : MAX_PROVIDER_IMAGE_BYTES;
            const maxMb = Math.floor(maxBytes / (1024 * 1024));
            pushToast({
              variant: 'error',
              title: titleFor('image'),
              message: locale === 'ar' ? `حجم الصورة كبير جداً. الحد الأقصى ${maxMb}MB.` : `Image is too large. Max is ${maxMb}MB.`,
            });
          } else if (code === 'PHONE_REQUIRED') {
            pushToast({ variant: 'error', title: titleFor('form'), message: tForm('errors.phoneRequired') });
          } else if (code === 'PHONE_INVALID_CHARACTERS') {
            pushToast({ variant: 'error', title: titleFor('form'), message: tForm('errors.phoneInvalidCharacters') });
          } else if (code === 'PHONE_INVALID_LENGTH' || code === 'PHONE_INVALID') {
            pushToast({ variant: 'error', title: titleFor('form'), message: tForm('errors.phoneInvalidLength') });
          } else {
            pushToast({
              variant: 'error',
              title: titleFor('server'),
              message: typeof code === 'string' ? code : (locale === 'ar' ? 'فشل التحديث' : 'Failed to update'),
            });
          }
          return;
        }
      }

      await refresh(mode);
      pushToast({
        variant: 'success',
        title: titleFor('success'),
        message: locale === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully',
      });
    } catch {
      pushToast({
        variant: 'error',
        title: titleFor('network'),
        message: locale === 'ar' ? 'فشل التحديث' : 'Failed to update',
      });
    } finally {
      setSavingAll(false);
    }
  };

  const deletePost = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(mode === 'merchants' ? `/api/merchant-posts/${id}` : `/api/providers/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        pushToast({
          variant: 'error',
          title: titleFor('server'),
          message: typeof data?.error === 'string' ? data.error : (locale === 'ar' ? 'فشل الحذف' : 'Failed to delete'),
        });
        return;
      }
      await refresh(mode);
      pushToast({
        variant: 'success',
        title: titleFor('success'),
        message: locale === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully',
      });
    } catch {
      pushToast({
        variant: 'error',
        title: titleFor('network'),
        message: locale === 'ar' ? 'فشل الحذف' : 'Failed to delete',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={styles.page}>
      {toasts.length ? (
        <div className={styles.toastContainer} aria-live="polite" aria-atomic="true">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`${styles.toast} ${toast.variant === 'success' ? styles.toastSuccess : styles.toastError}`}
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
          <h1 className={styles.title}>{tDash('title')}</h1>
          <div className={styles.headerActions}>
            <Link
              className={styles.linkButton}
              href={mode === 'merchants' ? `/${locale}/dashboard/add-merchant-post` : `/${locale}/dashboard/add-provider`}
            >
              {tDash('addNew')}
            </Link>
            <Link className={styles.linkButtonSecondary} href={`/${locale}`}>
              {tDash('backHome')}
            </Link>
          </div>
        </div>

        <div className={styles.body}>
          {loading ? (
            <div className={styles.loading}>{tDash('loading')}</div>
          ) : providers.length === 0 ? (
            <div className={styles.empty}>{tDash('empty')}</div>
          ) : (
            <div className={styles.list}>
              {providers.map((p) => {
                const e = edits[p.id];
                return (
                  <div key={p.id} className={styles.item}>
                    <div className={styles.itemTop}>
                      {p.image ? (
                        <img className={styles.itemImage} src={p.image} alt={p.name} />
                      ) : null}
                      <div className={styles.itemTitleRow}>
                        <div className={styles.itemTitle}>{p.name}</div>
                        <div className={styles.badge} data-active={p.active ? 'true' : 'false'}>
                          {p.active ? tDash('available') : tDash('notAvailable')}
                        </div>
                      </div>
                      <div className={styles.meta}>
                        {tDash('lastUpdate')}: {new Date(p.lastLocationUpdateAt).toLocaleString()}
                      </div>
                    </div>

                    <div className={styles.formRow}>
                      <label className={styles.label}>{tForm('location')}</label>
                      <select
                        className={styles.input}
                        value={e?.location ?? ''}
                        onChange={(ev) =>
                          setEdits((prev) => ({
                            ...prev,
                            [p.id]: { ...prev[p.id], location: ev.target.value },
                          }))
                        }
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

                    <div className={styles.formRow}>
                      <label className={styles.label}>{tForm('phone')}</label>
                      <input
                        className={styles.input}
                        value={e?.phone ?? ''}
                        onChange={(ev) =>
                          setEdits((prev) => ({
                            ...prev,
                            [p.id]: { ...prev[p.id], phone: ev.target.value },
                          }))
                        }
                      />
                    </div>

                    <div className={styles.formRow}>
                      <label className={styles.label}>{tForm('destination')}</label>
                      <select
                        className={styles.input}
                        value={e?.destination ?? ''}
                        onChange={(ev) =>
                          setEdits((prev) => ({
                            ...prev,
                            [p.id]: { ...prev[p.id], destination: ev.target.value },
                          }))
                        }
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

                    <div className={styles.formRow}>
                      <label className={styles.label}>{tForm('description')}</label>
                      <input
                        className={styles.input}
                        value={e?.description ?? ''}
                        onChange={(ev) =>
                          setEdits((prev) => ({
                            ...prev,
                            [p.id]: { ...prev[p.id], description: ev.target.value },
                          }))
                        }
                      />
                    </div>

                    <div className={styles.formRow}>
                      <label className={styles.label}>{tForm('image')}</label>
                      <input
                        className={styles.input}
                        type="file"
                        accept="image/*"
                        onChange={(ev) => {
                          const file = ev.target.files?.[0] ?? null;
                          if (file && file.size > MAX_PROVIDER_IMAGE_BYTES) {
                            const maxMb = Math.floor(MAX_PROVIDER_IMAGE_BYTES / (1024 * 1024));
                            pushToast({
                              variant: 'error',
                              title: titleFor('image'),
                              message: locale === 'ar' ? `حجم الصورة كبير جداً. الحد الأقصى ${maxMb}MB.` : `Image is too large. Max is ${maxMb}MB.`,
                            });
                            setEdits((prev) => ({
                              ...prev,
                              [p.id]: { ...prev[p.id], imageFile: null },
                            }));
                            return;
                          }
                          setEdits((prev) => ({
                            ...prev,
                            [p.id]: { ...prev[p.id], imageFile: file },
                          }));
                        }}
                      />
                      <div />
                    </div>

                    <div className={styles.actionsRow}>
                      <label className={styles.checkboxRow}>
                        <input
                          type="checkbox"
                          checked={Boolean(e?.active)}
                          onChange={(ev) =>
                            setEdits((prev) => ({
                              ...prev,
                              [p.id]: { ...prev[p.id], active: ev.target.checked },
                            }))
                          }
                        />
                        <span>{tForm('active')}</span>
                      </label>
                      <button
                        className={styles.deleteButton}
                        onClick={() => deletePost(p.id)}
                        disabled={deletingId === p.id}
                        type="button"
                      >
                        {deletingId === p.id ? tDash('saving') : tDash('delete')}
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className={styles.saveAllRow}>
                <button className={styles.button} type="button" onClick={saveAll} disabled={savingAll}>
                  {savingAll ? tDash('saving') : tDash('save')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
