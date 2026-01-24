'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import styles from './my-providers.module.css';
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

export default function MyProvidersPage() {
  const locale = useLocale();
  const t = useTranslations('providerDashboard');

  const locationOptionGroups = getLocationOptionGroups(locale === 'ar' ? 'ar' : 'en');

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

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

    const onOnline = () => {
      void refresh();
    };

    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('online', onOnline);
    };
  }, []);

  const updateLocation = async (id: number, newLocation: string) => {
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/providers/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ location: newLocation }),
      });
      const data = await res.json();
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
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t('title')}</h1>
          <div className={styles.headerActions}>
            <Link className={styles.linkButton} href={`/${locale}/dashboard/add-provider`}>
              {t('addNew')}
            </Link>
            <Link className={styles.linkButtonSecondary} href={`/${locale}`}>
              {t('backHome')}
            </Link>
          </div>
        </div>

        <div className={styles.body}>
          {error ? <div className={styles.error}>{error}</div> : null}

          {loading ? (
            <div className={styles.loading}>{t('loading')}</div>
          ) : providers.length === 0 ? (
            <div className={styles.empty}>{t('empty')}</div>
          ) : (
            <div className={styles.list}>
              {providers.map((p) => (
                <div key={p.id} className={styles.item}>
                  <div className={styles.itemTop}>
                    <div className={styles.itemTitleRow}>
                      <div className={styles.itemTitle}>{p.name}</div>
                      <div className={styles.badge} data-active={p.active ? 'true' : 'false'}>
                        {p.active ? t('available') : t('notAvailable')}
                      </div>
                    </div>
                    <div className={styles.meta}>
                      {t('lastUpdate')}: {new Date(p.lastLocationUpdateAt).toLocaleString()}
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <label className={styles.label}>{t('location')}</label>
                    <select
                      className={styles.input}
                      id={`loc-${p.id}`}
                      defaultValue={p.location}
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
                    <button
                      className={styles.button}
                      onClick={() => {
                        const input = document.getElementById(`loc-${p.id}`) as HTMLSelectElement | null;
                        updateLocation(p.id, input?.value ?? p.location);
                      }}
                      disabled={savingId === p.id}
                      type="button"
                    >
                      {savingId === p.id ? t('saving') : t('save')}
                    </button>
                  </div>

                  <div className={styles.actionsRow}>
                    <button
                      className={styles.deleteButton}
                      onClick={() => deleteProvider(p.id)}
                      disabled={savingId === p.id}
                      type="button"
                    >
                      {t('delete')}
                    </button>
                    <span className={styles.hint}>{t('deleteHint')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
