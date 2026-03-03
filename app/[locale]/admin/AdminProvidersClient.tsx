'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import styles from '../dashboard/my-providers/my-providers.module.css';
import { getLocationOptionGroups } from '@/lib/locations';
import { getDaysRemaining, formatDaysRemaining } from '@/lib/postLifetime';

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
  callCount?: number;
  viewCount?: number;
  lastLocationUpdateAt: string;
  createdAt: string;
  user?: {
    callsReceived?: number;
  } | null;
};

type ProviderEdits = {
  name: string;
  location: string;
  phone: string;
  destination: string;
  placeOfBusiness: string;
  description: string;
  active: boolean;
};

export default function AdminProvidersClient() {
  const locale = useLocale();
  const router = useRouter();
  const tDash = useTranslations('providerDashboard');
  const tForm = useTranslations('providerForm');

  const locationOptionGroups = getLocationOptionGroups(locale === 'ar' ? 'ar' : 'en');

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [imageFiles, setImageFiles] = useState<Record<number, File | null>>({});
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [removingImageId, setRemovingImageId] = useState<number | null>(null);
  const [savingSingleId, setSavingSingleId] = useState<number | null>(null);
  const [edits, setEdits] = useState<Record<number, ProviderEdits>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPosts, setExpandedPosts] = useState<Record<number, boolean>>({});

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/providers', { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || 'Failed to load');
        return;
      }
      setProviders(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load');
    } finally {
      setLoading(false);
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

      const res = await fetch(`/api/providers/${id}`, {
        method: 'PATCH',
        body: formData,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || 'Failed to update image');
        return;
      }

      await refresh();
      setImageFiles(prev => ({ ...prev, [id]: null }));
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
      const res = await fetch(`/api/providers/${id}`, {
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

  const saveAll = async () => {
    if (savingAll) return;

    setSavingAll(true);
    setError(null);
    try {
      const requests: Array<{ id: number; payload: Record<string, unknown> }> = [];

      for (const p of providers) {
        const current = edits[p.id];
        if (!current) continue;
        const payload = buildPayload(p, current);
        if (Object.keys(payload).length === 0) continue;
        requests.push({ id: p.id, payload });
      }

      for (const req of requests) {
        const res = await fetch(`/api/providers/${req.id}`, {
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

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const next: Record<number, ProviderEdits> = {};
    for (const p of providers) {
      next[p.id] = {
        name: p.name,
        location: p.location,
        phone: p.phone,
        destination: p.destination ?? '',
        placeOfBusiness: p.placeOfBusiness ?? '',
        description: p.description ?? '',
        active: p.active,
      };
    }
    setEdits(next);
  }, [providers]);

  useEffect(() => {
    setImageFiles({});
  }, [providers]);

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return providers;
    const query = searchQuery.toLowerCase();
    return providers.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.location.toLowerCase().includes(query) ||
      p.destination?.toLowerCase().includes(query) ||
      p.phone.toLowerCase().includes(query)
    );
  }, [providers, searchQuery]);

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
    const map = new Map<number, Provider>();
    for (const p of providers) map.set(p.id, p);
    return map;
  }, [providers]);

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
      const res = await fetch(`/api/providers/${id}`, {
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
    } catch {
      setError('Failed to update');
    } finally {
      setSavingSingleId(null);
    }
  };

  const buildPayload = (original: Provider, current: ProviderEdits) => {
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

    const placeOfBiz = current.placeOfBusiness.trim();
    const originalPlaceOfBiz = original.placeOfBusiness ?? '';
    if (placeOfBiz !== originalPlaceOfBiz) payload.placeOfBusiness = placeOfBiz || null;

    const desc = current.description.trim();
    if (desc !== (original.description ?? '')) payload.description = desc || null;

    if (!('location' in payload) && current.active !== original.active) {
      payload.active = current.active;
    }

    return payload;
  };

  const deleteProvider = async (id: number) => {
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/providers/${id}`, { method: 'DELETE' });
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
        ) : providers.length === 0 ? (
          <div className={styles.empty}>{tDash('empty')}</div>
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
                        <div className={styles.badge} data-active={p.active ? 'true' : 'false'}>
                          {p.active ? tDash('available') : tDash('notAvailable')}
                        </div>
                        {typeof p.callCount === 'number' || typeof p.viewCount === 'number' ? (
                          <div style={{ display: 'flex', gap: '8px', marginInlineEnd: '8px' }}>
                            {typeof p.callCount === 'number' && p.callCount > 0 ? (
                              <span className={styles.callsBadge} title={locale === 'ar' ? 'عدد المكالمات على هذا المنشور' : 'Calls on this post'}>
                                📞 {p.callCount}
                              </span>
                            ) : null}
                            {typeof p.viewCount === 'number' && p.viewCount > 0 ? (
                              <span className={styles.callsBadge} style={{ backgroundColor: 'transparent', color: '#000918ff' }} title={locale === 'ar' ? 'عدد المشاهدات' : 'View count'}>
                                👁 {p.viewCount}
                              </span>
                            ) : null}
                          </div>
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
                    <div className={styles.meta}>
                      {tDash('lastUpdate')}: {new Date(p.lastLocationUpdateAt).toLocaleString()}
                    </div>
                  </div>

                  {/* Collapsible Content */}
                  {isExpanded && (
                    <div className={styles.itemContent}>
                      {/* Form Inputs with Spacing */}
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
                          placeholder={locale === 'ar' ? 'أدخل الاسم' : 'Enter name'}
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
                            placeholder={locale === 'ar' ? 'أدخل رقم الهاتف' : 'Enter phone number'}
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
                          <label className={styles.label}>{tForm('placeOfBusiness')}</label>
                          <input
                            className={styles.input}
                            value={e?.placeOfBusiness ?? ''}
                            onChange={(ev) =>
                              setEdits((prev) => ({
                                ...prev,
                                [p.id]: { ...prev[p.id], placeOfBusiness: ev.target.value },
                              }))
                            }
                            placeholder={locale === 'ar' ? 'أدخل مجال العمل' : 'Enter place of business'}
                          />
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
                            placeholder={locale === 'ar' ? 'أدخل الوصف' : 'Enter description'}
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
                              if (window.confirm(locale === 'ar' 
                                ? 'هل أنت متأكد من حذف هذا المنشور؟' 
                                : 'Are you sure you want to delete this provider?'
                              )) {
                                deleteProvider(p.id);
                              }
                            }}
                            disabled={savingId === p.id}
                            type="button"
                          >
                            {savingId === p.id 
                              ? (locale === 'ar' ? 'جارٍ الحذف...' : 'Deleting...') 
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
                  ? (locale === 'ar' ? 'جارٍ الحفظ...' : tDash('saving')) 
                  : tDash('save')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}