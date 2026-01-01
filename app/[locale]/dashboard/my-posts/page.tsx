'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import styles from '../my-providers/my-providers.module.css';
import { getLocationOptions } from '@/lib/locations';

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
};

export default function MyPostsPage() {
  const locale = useLocale();
  const tDash = useTranslations('providerDashboard');
  const tForm = useTranslations('providerForm');

  const locationOptions = getLocationOptions(locale === 'ar' ? 'ar' : 'en');

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [edits, setEdits] = useState<Record<number, ProviderEdits>>({});

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/providers/mine');
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to load');
        return;
      }
      setProviders(data);
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
    const next: Record<number, ProviderEdits> = {};
    for (const p of providers) {
      next[p.id] = {
        location: p.location,
        phone: p.phone,
        destination: (p.destination ?? p.placeOfBusiness) ?? '',
        description: p.description ?? '',
        active: p.active,
      };
    }
    setEdits(next);
  }, [providers]);

  const byId = useMemo(() => {
    const map = new Map<number, Provider>();
    for (const p of providers) map.set(p.id, p);
    return map;
  }, [providers]);

  const updatePost = async (id: number) => {
    const original = byId.get(id);
    const current = edits[id];
    if (!original || !current) return;

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

    if (
      !('location' in payload) &&
      current.active !== original.active
    ) {
      payload.active = current.active;
    }

    if (Object.keys(payload).length === 0) return;

    setSavingId(id);
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
      setSavingId(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>{tDash('title')}</h1>
          <div className={styles.headerActions}>
            <Link className={styles.linkButton} href={`/${locale}/dashboard/add-provider`}>
              {tDash('addNew')}
            </Link>
            <Link className={styles.linkButtonSecondary} href={`/${locale}`}>
              {tDash('backHome')}
            </Link>
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
              {providers.map((p) => {
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
                        {locationOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <button
                        className={styles.button}
                        onClick={() => updatePost(p.id)}
                        disabled={savingId === p.id}
                        type="button"
                      >
                        {savingId === p.id ? tDash('saving') : tDash('save')}
                      </button>
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
                      <button
                        className={styles.button}
                        onClick={() => updatePost(p.id)}
                        disabled={savingId === p.id}
                        type="button"
                      >
                        {savingId === p.id ? tDash('saving') : tDash('save')}
                      </button>
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
                        {locationOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <button
                        className={styles.button}
                        onClick={() => updatePost(p.id)}
                        disabled={savingId === p.id}
                        type="button"
                      >
                        {savingId === p.id ? tDash('saving') : tDash('save')}
                      </button>
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
                      <button
                        className={styles.button}
                        onClick={() => updatePost(p.id)}
                        disabled={savingId === p.id}
                        type="button"
                      >
                        {savingId === p.id ? tDash('saving') : tDash('save')}
                      </button>
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
                        className={styles.button}
                        onClick={() => updatePost(p.id)}
                        disabled={savingId === p.id}
                        type="button"
                      >
                        {savingId === p.id ? tDash('saving') : tDash('save')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
