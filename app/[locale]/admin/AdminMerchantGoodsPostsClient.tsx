'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import styles from '../dashboard/my-providers/my-providers.module.css';
import { getLocationOptionGroups } from '@/lib/locations';
import { VEHICLE_TYPE_CONFIG, getVehicleLabel } from '@/lib/vehicleTypes';
import { getDaysRemaining, formatDaysRemaining } from '@/lib/postLifetime';

type MerchantGoodsPost = {
  id: number;
  name: string;
  startingPoint: string;
  destination: string;
  goodsType: string;
  goodsWeight: number;
  goodsWeightUnit: string;
  loadingDate: string;
  vehicleTypeDesired: string;
  image: string | null;
  description: string | null;
  createdAt: string;
  userId: string;
  user?: {
    fullName?: string;
    callsReceived?: number;
  };
};

type PostEdits = {
  name: string;
  startingPoint: string;
  destination: string;
  goodsType: string;
  goodsWeight: string;
  goodsWeightUnit: 'kg' | 'ton';
  loadingDate: string;
  vehicleTypeDesired: string;
  description: string;
};

export default function AdminMerchantGoodsPostsClient() {
  const locale = useLocale();
  const router = useRouter();
  const tDash = useTranslations('providerDashboard');

  const locationOptionGroups = getLocationOptionGroups(locale === 'ar' ? 'ar' : 'en');

  const [posts, setPosts] = useState<MerchantGoodsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [imageFiles, setImageFiles] = useState<Record<number, File | null>>({});
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [removingImageId, setRemovingImageId] = useState<number | null>(null);
  const [edits, setEdits] = useState<Record<number, PostEdits>>({});
  const [savingSingleId, setSavingSingleId] = useState<number | null>(null);
  const [vehicleTypeOpen, setVehicleTypeOpen] = useState<Record<number, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPosts, setExpandedPosts] = useState<Record<number, boolean>>({});

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/merchant-goods-posts', { cache: 'no-store' });
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

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const next: Record<number, PostEdits> = {};
    for (const p of posts) {
      const isoDate = (() => {
        const d = new Date(p.loadingDate as any);
        if (Number.isNaN(d.getTime())) return '';
        return d.toISOString().slice(0, 10);
      })();

      next[p.id] = {
        name: p.name ?? '',
        startingPoint: p.startingPoint ?? '',
        destination: p.destination ?? '',
        goodsType: p.goodsType ?? '',
        goodsWeight: typeof p.goodsWeight === 'number' ? String(p.goodsWeight) : '',
        goodsWeightUnit: (p.goodsWeightUnit as any) === 'ton' ? 'ton' : 'kg',
        loadingDate: isoDate,
        vehicleTypeDesired: p.vehicleTypeDesired ?? '',
        description: p.description ?? '',
      };
    }
    setEdits(next);
  }, [posts]);

  useEffect(() => {
    setImageFiles({});
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts;
    const query = searchQuery.toLowerCase();
    return posts.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.startingPoint.toLowerCase().includes(query) ||
      p.destination.toLowerCase().includes(query) ||
      p.goodsType.toLowerCase().includes(query) ||
      p.user?.fullName?.toLowerCase().includes(query)
    );
  }, [posts, searchQuery]);

  const toggleExpanded = (id: number) => {
    setExpandedPosts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const allExpanded: Record<number, boolean> = {};
    filteredPosts.forEach(p => allExpanded[p.id] = true);
    setExpandedPosts(allExpanded);
  };

  const collapseAll = () => {
    setExpandedPosts({});
  };

  const byId = useMemo(() => {
    const map = new Map<number, MerchantGoodsPost>();
    for (const p of posts) map.set(p.id, p);
    return map;
  }, [posts]);

  const saveSingle = async (id: number) => {
    if (savingSingleId === id) return;

    const original = byId.get(id);
    const current = edits[id];
    if (!original || !current) return;

    const payload = buildPayload(original, current);
    if (Object.keys(payload).length === 0) return;

    setSavingSingleId(id);
    setError(null);
    try {
      const res = await fetch(`/api/merchant-goods-posts/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || 'Failed to update');
        return;
      }

      await refresh();

      try {
        void fetch('/api/merchant-goods-posts', { credentials: 'include' }).catch(() => null);
        window.dispatchEvent(new Event('saweg:warmup'));
      } catch {
        // ignore
      }
    } catch {
      setError('Failed to update');
    } finally {
      setSavingSingleId(null);
    }
  };

  const buildPayload = (original: MerchantGoodsPost, current: PostEdits) => {
    const payload: Record<string, unknown> = {};

    const nextName = current.name.trim();
    if (nextName && nextName !== original.name) payload.name = nextName;

    const nextStarting = current.startingPoint.trim();
    if (nextStarting && nextStarting !== original.startingPoint) payload.startingPoint = nextStarting;

    const nextDestination = current.destination.trim();
    if (nextDestination && nextDestination !== original.destination) payload.destination = nextDestination;

    const nextGoodsType = current.goodsType.trim();
    if (nextGoodsType && nextGoodsType !== original.goodsType) payload.goodsType = nextGoodsType;

    const nextWeight = current.goodsWeight.trim();
    if (nextWeight) {
      const n = Number(nextWeight);
      if (Number.isFinite(n) && n > 0 && n !== original.goodsWeight) payload.goodsWeight = n;
    }

    const nextUnit = current.goodsWeightUnit;
    if (nextUnit && nextUnit !== original.goodsWeightUnit) payload.goodsWeightUnit = nextUnit;

    const nextDate = current.loadingDate.trim();
    if (nextDate) {
      const iso = (() => {
        try {
          const d = new Date(original.loadingDate as any);
          if (Number.isNaN(d.getTime())) return '';
          return d.toISOString().slice(0, 10);
        } catch {
          return '';
        }
      })();
      if (nextDate !== iso) payload.loadingDate = nextDate;
    }

    const nextVehicle = current.vehicleTypeDesired.trim();
    if (nextVehicle && nextVehicle !== original.vehicleTypeDesired) payload.vehicleTypeDesired = nextVehicle;

    const nextDesc = current.description.trim();
    if (nextDesc !== (original.description ?? '')) payload.description = nextDesc || null;

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
        const res = await fetch(`/api/merchant-goods-posts/${req.id}`, {
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

      try {
        void fetch('/api/merchant-goods-posts', { credentials: 'include' }).catch(() => null);
        window.dispatchEvent(new Event('saweg:warmup'));
      } catch {
        // ignore
      }
    } catch {
      setError('Failed to update');
    } finally {
      setSavingAll(false);
    }
  };

  const uploadImage = async (id: number) => {
    const file = imageFiles[id];
    if (!file) return;

    setUploadingId(id);
    setError(null);
    try {
      const formData = new FormData();
      formData.set('image', file);

      const res = await fetch(`/api/merchant-goods-posts/${id}`, {
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

      try {
        void fetch('/api/merchant-goods-posts', { credentials: 'include' }).catch(() => null);
        window.dispatchEvent(new Event('saweg:warmup'));
      } catch {
        // ignore
      }
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
      const res = await fetch(`/api/merchant-goods-posts/${id}`, {
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

      try {
        void fetch('/api/merchant-goods-posts', { credentials: 'include' }).catch(() => null);
        window.dispatchEvent(new Event('saweg:warmup'));
      } catch {
        // ignore
      }
    } catch {
      setError('Failed to remove image');
    } finally {
      setRemovingImageId(null);
    }
  };

  const deletePost = async (id: number) => {
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/merchant-goods-posts/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || 'Failed to delete');
        return;
      }
      await refresh();

      try {
        void fetch('/api/merchant-goods-posts', { credentials: 'include' }).catch(() => null);
        window.dispatchEvent(new Event('saweg:warmup'));
      } catch {
        // ignore
      }
    } catch {
      setError('Failed to delete');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>{locale === 'ar' ? 'إدارة منشورات التجّار' : 'Manage Merchant Posts'}</h2>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.linkButtonSecondary}
            onClick={() => {
              try {
                router.back();
              } catch {
                router.push(`/${locale}/admin`);
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
          <div className={styles.empty}>{locale === 'ar' ? 'لا توجد منشورات' : 'No posts found'}</div>
        ) : (
          <div className={styles.list}>
            {/* Search and Controls Bar */}
            <div className={styles.adminControls}>
              <div className={styles.searchBox}>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder={locale === 'ar' ? 'بحث في المنشورات...' : 'Search posts...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <span className={styles.searchIcon}>🔍</span>
              </div>
              <div className={styles.postCount}>
                {locale === 'ar' 
                  ? `إجمالي: ${filteredPosts.length} منشور`
                  : `Total: ${filteredPosts.length} posts`}
              </div>
              <div className={styles.expandControls}>
                <button
                  type="button"
                  className={styles.linkButtonSecondary}
                  onClick={expandAll}
                >
                  {locale === 'ar' ? 'فتح الكل' : 'Expand All'}
                </button>
                <button
                  type="button"
                  className={styles.linkButtonSecondary}
                  onClick={collapseAll}
                >
                  {locale === 'ar' ? 'طي الكل' : 'Collapse All'}
                </button>
              </div>
            </div>

            {filteredPosts.length === 0 ? (
              <div className={styles.empty}>
                {locale === 'ar' ? 'لا توجد نتائج للبحث' : 'No search results'}
              </div>
            ) : (
              filteredPosts.map((p) => {
                const e = edits[p.id];
                const ownerName = p.user?.fullName || '';
                const postDate = (() => {
                  try {
                    return new Date(p.createdAt).toLocaleString();
                  } catch {
                    return p.createdAt;
                  }
                })();
                const isExpanded = expandedPosts[p.id] ?? false;
                const daysInfo = getDaysRemaining(p.createdAt);

                return (
                  <div key={p.id} className={styles.item}>
                    {/* Collapsible Header */}
                    <div 
                      className={styles.itemHeader}
                      onClick={() => toggleExpanded(p.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className={styles.itemTitleRow}>
                        <div className={styles.itemTitle}>{p.name}</div>
                        <div className={styles.headerActions}>
                          {ownerName ? <span className={styles.meta}>{ownerName}</span> : null}
                          {p.user?.callsReceived ? (
                            <span className={styles.callsBadge} title={locale === 'ar' ? 'عدد المكالمات' : 'Call count'}>
                              📞 {p.user.callsReceived}
                            </span>
                          ) : null}
                          <span
                            className={styles.daysRemainingBadge}
                            data-expired={daysInfo.isExpired}
                            title={locale === 'ar' ? 'الأيام المتبقية قبل الحذف التلقائي' : 'Days remaining before auto-deletion'}
                          >
                            ⏳ {formatDaysRemaining(daysInfo.daysRemaining, locale)}
                          </span>
                          <span className={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
                        </div>
                      </div>
                      <div className={styles.meta}>{locale === 'ar' ? 'تاريخ الإنشاء' : 'Created'}: {postDate}</div>
                    </div>

                    {/* Collapsible Content */}
                    {isExpanded && (
                      <div className={styles.itemContent}>

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
                            id={`merchant-image-upload-${p.id}`}
                            accept="image/*"
                            onChange={(ev) => {
                              const f = ev.target.files?.[0] ?? null;
                              setImageFiles((prev) => ({ ...prev, [p.id]: f }));
                            }}
                          />
                          <label htmlFor={`merchant-image-upload-${p.id}`} className={styles.fileInputLabel}>
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
                    <label className={styles.label}>{locale === 'ar' ? 'الاسم (للمشرف فقط)' : 'Name (admin only)'}</label>
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
                    <label className={styles.label}>{locale === 'ar' ? 'نقطة البداية' : 'Starting point'}</label>
                    <select
                      className={styles.input}
                      value={e?.startingPoint ?? ''}
                      onChange={(ev) =>
                        setEdits((prev) => ({
                          ...prev,
                          [p.id]: { ...prev[p.id], startingPoint: ev.target.value },
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
                    <label className={styles.label}>{locale === 'ar' ? 'الوجهة' : 'Destination'}</label>
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
                    <label className={styles.label}>{locale === 'ar' ? 'نوع البضاعة' : 'Goods type'}</label>
                    <input
                      className={styles.input}
                      value={e?.goodsType ?? ''}
                      onChange={(ev) =>
                        setEdits((prev) => ({
                          ...prev,
                          [p.id]: { ...prev[p.id], goodsType: ev.target.value },
                        }))
                      }
                    />
                  </div>

                  <div className={`${styles.formRow} ${styles.formRowSpaced}`}>
                    <label className={styles.label}>{locale === 'ar' ? 'وزن البضاعة' : 'Goods weight'}</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        className={styles.input}
                        value={e?.goodsWeight ?? ''}
                        onChange={(ev) =>
                          setEdits((prev) => ({
                            ...prev,
                            [p.id]: { ...prev[p.id], goodsWeight: ev.target.value },
                          }))
                        }
                        inputMode="decimal"
                      />
                      <select
                        className={styles.input}
                        value={e?.goodsWeightUnit ?? 'kg'}
                        onChange={(ev) =>
                          setEdits((prev) => ({
                            ...prev,
                            [p.id]: { ...prev[p.id], goodsWeightUnit: ev.target.value as any },
                          }))
                        }
                        style={{ maxWidth: '8rem' }}
                      >
                        <option value="kg">{locale === 'ar' ? 'كغ' : 'kg'}</option>
                        <option value="ton">{locale === 'ar' ? 'طن' : 'ton'}</option>
                      </select>
                    </div>
                  </div>

                  <div className={`${styles.formRow} ${styles.formRowSpaced}`}>
                    <label className={styles.label}>{locale === 'ar' ? 'تاريخ التحميل' : 'Loading date'}</label>
                    <input
                      className={styles.input}
                      type="date"
                      value={e?.loadingDate ?? ''}
                      onChange={(ev) =>
                        setEdits((prev) => ({
                          ...prev,
                          [p.id]: { ...prev[p.id], loadingDate: ev.target.value },
                        }))
                      }
                    />
                  </div>

                  <div className={`${styles.formRow} ${styles.formRowSpaced}`}>
                    <label className={styles.label}>{locale === 'ar' ? 'نوع المركبة المطلوبة' : 'Vehicle needed'}</label>
                    <div className={styles.vehicleTypeRoot} data-vehicle-type-root="true">
                      <button
                        type="button"
                        className={`${styles.input} ${styles.vehicleTypeButton}`}
                        aria-haspopup="listbox"
                        aria-expanded={vehicleTypeOpen[p.id] ? 'true' : 'false'}
                        onClick={() =>
                          setVehicleTypeOpen((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
                        }
                      >
                        {e?.vehicleTypeDesired ? (
                          (() => {
                            const selected = VEHICLE_TYPE_CONFIG.find((opt) => opt.id === e.vehicleTypeDesired);
                            return selected ? (
                              <span className={styles.vehicleTypeButtonInner}>
                                <img
                                  src={selected.imagePath}
                                  alt={getVehicleLabel(selected.id, locale === 'ar' ? 'ar' : 'en')}
                                  className={styles.vehicleTypeThumb}
                                  loading="lazy"
                                />
                                <span className={styles.vehicleTypeButtonLabel}>
                                  {getVehicleLabel(selected.id, locale === 'ar' ? 'ar' : 'en')}
                                </span>
                              </span>
                            ) : (
                              <span className={styles.vehicleTypePlaceholder}>
                                {locale === 'ar' ? 'اختر نوع المركبة' : 'Choose vehicle type'}
                              </span>
                            );
                          })()
                        ) : (
                          <span className={styles.vehicleTypePlaceholder}>
                            {locale === 'ar' ? 'اختر نوع المركبة' : 'Choose vehicle type'}
                          </span>
                        )}
                      </button>

                      {vehicleTypeOpen[p.id] ? (
                        <div className={styles.vehicleTypePopover} role="listbox">
                          {VEHICLE_TYPE_CONFIG.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              className={styles.vehicleTypeOption}
                              role="option"
                              aria-selected={opt.id === e?.vehicleTypeDesired ? 'true' : 'false'}
                              onClick={() => {
                                setEdits((prev) => ({
                                  ...prev,
                                  [p.id]: { ...prev[p.id], vehicleTypeDesired: opt.id },
                                }));
                                setVehicleTypeOpen((prev) => ({ ...prev, [p.id]: false }));
                              }}
                            >
                              <img
                                src={opt.imagePath}
                                alt={getVehicleLabel(opt.id, locale === 'ar' ? 'ar' : 'en')}
                                className={styles.vehicleTypeOptionThumb}
                                loading="lazy"
                              />
                              <span className={styles.vehicleTypeOptionLabel}>
                                {getVehicleLabel(opt.id, locale === 'ar' ? 'ar' : 'en')}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className={`${styles.formRow} ${styles.formRowSpaced}`}>
                    <label className={styles.label}>{locale === 'ar' ? 'الوصف' : 'Description'}</label>
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

                  <div className={`${styles.actionsRow} ${styles.deleteSection}`}>
                    <button
                      className={`${styles.button} ${styles.saveButton}`}
                      onClick={() => saveSingle(p.id)}
                      disabled={savingSingleId === p.id || savingAll || savingId !== null}
                      type="button"
                    >
                      {savingSingleId === p.id
                        ? locale === 'ar'
                          ? 'جارٍ الحفظ...'
                          : 'Saving...'
                        : locale === 'ar'
                          ? 'حفظ'
                          : 'Save'}
                    </button>
                    <button
                      className={`${styles.deleteButton} ${styles.deleteProviderButton}`}
                      onClick={() => {
                        if (
                          window.confirm(
                            locale === 'ar'
                              ? 'هل أنت متأكد من حذف هذا المنشور؟'
                              : 'Are you sure you want to delete this post?'
                          )
                        ) {
                          deletePost(p.id);
                        }
                      }}
                      disabled={savingId === p.id}
                      type="button"
                    >
                      {savingId === p.id
                        ? locale === 'ar'
                          ? 'جارٍ الحذف...'
                          : 'Deleting...'
                        : tDash('delete')}
                    </button>
                    <span className={styles.hint}>{tDash('deleteHint')}</span>
                  </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            <div className={styles.saveAllRow}>
              <button
                className={`${styles.button} ${styles.saveAllButton}`}
                type="button"
                onClick={saveAll}
                disabled={savingAll || savingId !== null}
              >
                {savingAll
                  ? locale === 'ar'
                    ? 'جارٍ الحفظ...'
                    : tDash('saving')
                  : tDash('save')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
