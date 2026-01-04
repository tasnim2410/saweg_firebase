'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import styles from '../dashboard/my-providers/my-providers.module.css';
import { getLocationOptionGroups } from '@/lib/locations';

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
  name: string;
  location: string;
  phone: string;
  destination: string;
  description: string;
  active: boolean;
};

export default function AdminProvidersClient() {
  const locale = useLocale();
  const tDash = useTranslations('providerDashboard');
  const tForm = useTranslations('providerForm');

  const locationOptionGroups = getLocationOptionGroups(locale === 'ar' ? 'ar' : 'en');

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [edits, setEdits] = useState<Record<number, ProviderEdits>>({});

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

  const buildPayload = (original: Provider, current: ProviderEdits) => {
    const payload: Record<string, unknown> = {};

    const nextName = current.name.trim();
    if (nextName && nextName !== original.name) payload.name = nextName;

    const nextLocation = current.location.trim();
    if (nextLocation && nextLocation !== original.location) payload.location = nextLocation;

    const nextPhone = current.phone.trim();
    if (nextPhone && nextPhone !== original.phone) payload.phone = nextPhone;

    const dest = current.destination.trim();
    const originalDest = (original.destination ?? original.placeOfBusiness) ?? '';
    if (dest !== originalDest) payload.destination = dest || null;

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
                  </div>

                  <div className={styles.actionsRow}>
                    <button
                      className={styles.deleteButton}
                      onClick={() => deleteProvider(p.id)}
                      disabled={savingId === p.id}
                      type="button"
                    >
                      {tDash('delete')}
                    </button>
                    <span className={styles.hint}>{tDash('deleteHint')}</span>
                  </div>
                </div>
              );
            })}

            <div className={styles.saveAllRow}>
              <button className={styles.button} type="button" onClick={saveAll} disabled={savingAll || savingId !== null}>
                {savingAll ? tDash('saving') : tDash('save')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
