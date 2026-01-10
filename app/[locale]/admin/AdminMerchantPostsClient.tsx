'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import styles from '../dashboard/my-providers/my-providers.module.css';
import { getLocationOptionGroups } from '@/lib/locations';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

type Post = {
  id: number;
  name: string;
  location: string;
  phone: string;
  destination?: string | null;
  description: string | null;
  image: string | null;
  active: boolean;
  lastLocationUpdateAt: string;
  createdAt: string;
};

type PostEdits = {
  name: string;
  location: string;
  phone: string;
  destination: string;
  description: string;
  active: boolean;
};

export default function AdminMerchantPostsClient() {
  const locale = useLocale();
  const router = useRouter();
  const tDash = useTranslations('providerDashboard');
  const tForm = useTranslations('providerForm');

  const locationOptionGroups = getLocationOptionGroups(locale === 'ar' ? 'ar' : 'en');

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [imageFiles, setImageFiles] = useState<Record<number, File | null>>({});
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [removingImageId, setRemovingImageId] = useState<number | null>(null);
  const [edits, setEdits] = useState<Record<number, PostEdits>>({});

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/merchant-posts', { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || 'Failed to load');
        return;
      }
      setPosts(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (id: number) => {
    const file = imageFiles[id];
    if (!file) return;

    if (file.size > MAX_IMAGE_BYTES) {
      setError(locale === 'ar' ? 'حجم الصورة كبير جداً (الحد الأقصى 10MB)' : 'Image is too large (max 10MB)');
      return;
    }

    setUploadingId(id);
    setError(null);
    try {
      const formData = new FormData();
      formData.set('image', file);

      const res = await fetch(`/api/merchant-posts/${id}`, {
        method: 'PATCH',
        body: formData,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || 'Failed to update image');
        return;
      }

      await refresh();
      setImageFiles((prev) => ({ ...prev, [id]: null }));
    } catch {
      setError('Failed to update image');
    } finally {
      setUploadingId(null);
    }
  };

  const removeImage = async (id: number) => {
    setRemovingImageId(id);
    setError(null);
    try {
      const res = await fetch(`/api/merchant-posts/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ removeImage: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || 'Failed to remove image');
        return;
      }

      await refresh();
    } catch {
      setError('Failed to remove image');
    } finally {
      setRemovingImageId(null);
    }
  };

  const byId = useMemo(() => {
    const map = new Map<number, Post>();
    for (const p of posts) map.set(p.id, p);
    return map;
  }, [posts]);

  const buildPayload = (original: Post, current: PostEdits) => {
    const payload: Record<string, unknown> = {};

    const nextName = current.name.trim();
    if (nextName && nextName !== original.name) payload.name = nextName;

    const nextLocation = current.location.trim();
    if (nextLocation && nextLocation !== original.location) payload.location = nextLocation;

    const nextPhone = current.phone.trim();
    if (nextPhone && nextPhone !== original.phone) payload.phone = nextPhone;

    const dest = current.destination.trim();
    const originalDest = original.destination ?? '';
    if (dest !== originalDest) payload.destination = dest || null;

    const desc = current.description.trim();
    if (desc !== (original.description ?? '')) payload.description = desc || null;

    if (!('location' in payload) && current.active !== original.active) {
      payload.active = current.active;
    }

    return payload;
  };

  const saveAll = async () => {
    if (savingAll) return;

    setSavingAll(true);
    setError(null);
    try {
      const requests: Array<{ id: number; payload: Record<string, unknown> }> = [];

      for (const p of posts) {
        const current = edits[p.id];
        if (!current) continue;
        const payload = buildPayload(p, current);
        if (Object.keys(payload).length === 0) continue;
        requests.push({ id: p.id, payload });
      }

      for (const req of requests) {
        const res = await fetch(`/api/merchant-posts/${req.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(req.payload),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setError(data?.error || 'Failed to update');
          return;
        }
      }

      await refresh();
    } catch {
      setError('Failed to update');
    } finally {
      setSavingAll(false);
    }
  };

  const deletePost = async (id: number) => {
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/merchant-posts/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || 'Failed to delete');
        return;
      }
      await refresh();
    } catch {
      setError('Failed to delete');
    } finally {
      setSavingId(null);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const next: Record<number, PostEdits> = {};
    for (const p of posts) {
      next[p.id] = {
        name: p.name,
        location: p.location,
        phone: p.phone,
        destination: p.destination ?? '',
        description: p.description ?? '',
        active: p.active,
      };
    }
    setEdits(next);
  }, [posts]);

  useEffect(() => {
    setImageFiles({});
  }, [posts]);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>{locale === 'ar' ? 'إدارة المنشورات' : 'Manage Posts'}</h2>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.linkButtonSecondary}
            onClick={() => {
              try {
                router.back();
              } catch {
                router.push(`/${locale}`);
              }
            }}
          >
            {locale === 'ar' ? 'رجوع' : 'Back'}
          </button>
        </div>
      </div>

      <div className={styles.body}>
        {error ? <div className={styles.error}>{error}</div> : null}

        {loading ? (
          <div className={styles.loading}>{tDash('loading')}</div>
        ) : posts.length === 0 ? (
          <div className={styles.empty}>{tDash('empty')}</div>
        ) : (
          <div className={styles.list}>
            {posts.map((p) => {
              const e = edits[p.id];
              return (
                <div key={p.id} className={styles.item}>
                  <div className={styles.itemTop}>
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

                  <div className={styles.imageSection}>
                    <div className={styles.imagePreviewContainer}>
                      {p.image ? (
                        <div className={styles.imageWrapper}>
                          <img className={styles.itemImage} src={p.image} alt={p.name} />
                          <div className={styles.imageOverlay}>
                            <span className={styles.imageLabel}>{locale === 'ar' ? 'الصورة الحالية' : 'Current Image'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.noImage}>
                          <span>{locale === 'ar' ? 'لا توجد صورة' : 'No Image'}</span>
                        </div>
                      )}
                    </div>

                    <div className={styles.imageControls}>
                      <div className={`${styles.formRow} ${styles.formRowSpaced}`}>
                        <label className={styles.label}>{locale === 'ar' ? 'تحميل صورة جديدة' : 'Upload New Image'}</label>
                        <div className={styles.fileInputWrapper}>
                          <input
                            className={styles.fileInput}
                            type="file"
                            id={`image-upload-${p.id}`}
                            accept="image/*"
                            onChange={(ev) => {
                              const f = ev.target.files?.[0] ?? null;
                              setImageFiles((prev) => ({ ...prev, [p.id]: f }));
                            }}
                          />
                          <label htmlFor={`image-upload-${p.id}`} className={styles.fileInputLabel}>
                            {imageFiles[p.id]
                              ? imageFiles[p.id]?.name
                              : locale === 'ar'
                                ? 'اختر ملف'
                                : 'Choose file'}
                          </label>
                        </div>
                      </div>

                      <div className={styles.imageButtonsRow}>
                        <button
                          className={`${styles.button} ${styles.imageButton}`}
                          type="button"
                          onClick={() => uploadImage(p.id)}
                          disabled={!imageFiles[p.id] || uploadingId === p.id || savingAll || savingId !== null}
                        >
                          {uploadingId === p.id
                            ? locale === 'ar'
                              ? 'جارٍ الرفع...'
                              : 'Uploading...'
                            : locale === 'ar'
                              ? 'رفع الصورة'
                              : 'Upload Image'}
                        </button>

                        <button
                          className={`${styles.deleteButton} ${styles.imageButton}`}
                          type="button"
                          onClick={() => removeImage(p.id)}
                          disabled={!p.image || removingImageId === p.id || savingAll || savingId !== null}
                        >
                          {removingImageId === p.id
                            ? locale === 'ar'
                              ? 'جارٍ الحذف...'
                              : 'Removing...'
                            : locale === 'ar'
                              ? 'حذف الصورة'
                              : 'Remove Image'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={`${styles.formRow} ${styles.formRowSpaced}`}>
                    <label className={styles.label}>{tForm('name')}</label>
                    <input
                      className={styles.input}
                      value={e?.name ?? ''}
                      onChange={(ev) =>
                        setEdits((prev) => ({
                          ...prev,
                          [p.id]: { ...prev[p.id], name: ev.target.value },
                        }))
                      }
                    />
                  </div>

                  <div className={`${styles.formRow} ${styles.formRowSpaced}`}>
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
                      <option value="">{locale === 'ar' ? '-- اختر الموقع --' : '-- Select Location --'}</option>
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

                  <div className={`${styles.formRow} ${styles.formRowSpaced}`}>
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

                  <div className={`${styles.formRow} ${styles.formRowSpaced}`}>
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
                      <option value="">{locale === 'ar' ? '-- اختر الوجهة --' : '-- Select Destination --'}</option>
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

                  <div className={`${styles.formRow} ${styles.formRowSpaced}`}>
                    <label className={styles.label}>{tForm('description')}</label>
                    <textarea
                      className={styles.textarea}
                      value={e?.description ?? ''}
                      onChange={(ev) =>
                        setEdits((prev) => ({
                          ...prev,
                          [p.id]: { ...prev[p.id], description: ev.target.value },
                        }))
                      }
                      rows={3}
                    />
                  </div>

                  <div className={`${styles.actionsRow} ${styles.checkboxRowSpaced}`}>
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
                  </div>

                  <div className={`${styles.actionsRow} ${styles.deleteSection}`}>
                    <button
                      className={`${styles.deleteButton} ${styles.deleteProviderButton}`}
                      onClick={() => deletePost(p.id)}
                      disabled={savingId === p.id}
                      type="button"
                    >
                      {savingId === p.id
                        ? locale === 'ar'
                          ? 'جارٍ الحذف...'
                          : 'Deleting...'
                        : tDash('delete')}
                    </button>
                  </div>
                </div>
              );
            })}

            <div className={styles.saveAllRow}>
              <button
                className={`${styles.button} ${styles.saveAllButton}`}
                type="button"
                onClick={saveAll}
                disabled={savingAll || savingId !== null}
              >
                {savingAll ? tDash('saving') : tDash('save')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
