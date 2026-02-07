'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { MapPin, Navigation, Truck, Clock } from 'lucide-react';
import styles from './page.module.css';
import LocationSharing from '../_components/LocationSharing';

interface Provider {
  id: number;
  name: string;
  location: string;
  destination: string | null;
  phone: string;
  active: boolean;
}

export default function ActiveTripPage() {
  const t = useTranslations('activeTrip');
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const res = await fetch('/api/providers/mine', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load providers');

        const data = await res.json();
        if (data.providers && data.providers.length > 0) {
          setProviders(data.providers);
          // Select first active provider by default
          const active = data.providers.find((p: Provider) => p.active);
          if (active) {
            setSelectedProvider(active);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };

    loadProviders();
  }, []);

  if (loading) {
    return (
      <div className={styles.container} data-rtl={isRTL}>
        <div className={styles.loading}>{t('loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container} data-rtl={isRTL}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className={styles.container} data-rtl={isRTL}>
        <div className={styles.empty}>
          <Truck size={48} className={styles.emptyIcon} />
          <h2>{t('noProviders')}</h2>
          <p>{t('addProviderFirst')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} data-rtl={isRTL}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.subtitle}>{t('subtitle')}</p>
      </div>

      {/* Provider Selector */}
      <div className={styles.providerSelector}>
        <label className={styles.label}>{t('selectProvider')}</label>
        <select
          className={styles.select}
          value={selectedProvider?.id || ''}
          onChange={(e) => {
            const provider = providers.find((p) => p.id === parseInt(e.target.value));
            setSelectedProvider(provider || null);
          }}
        >
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name} - {provider.location} → {provider.destination || t('noDestination')}
            </option>
          ))}
        </select>
      </div>

      {/* Trip Info Card */}
      {selectedProvider && (
        <div className={styles.tripCard}>
          <div className={styles.tripHeader}>
            <Navigation size={20} />
            <span>{t('currentTrip')}</span>
          </div>
          <div className={styles.tripDetails}>
            <div className={styles.route}>
              <span className={styles.origin}>{selectedProvider.location}</span>
              <span className={styles.arrow}>→</span>
              <span className={styles.destination}>
                {selectedProvider.destination || t('noDestination')}
              </span>
            </div>
            <div className={styles.tripMeta}>
              <span className={styles.status} data-active={selectedProvider.active}>
                {selectedProvider.active ? t('active') : t('inactive')}
              </span>
              <span className={styles.phone}>{selectedProvider.phone}</span>
            </div>
          </div>
        </div>
      )}

      {/* Location Sharing Component */}
      <div className={styles.locationSection}>
        <h2 className={styles.sectionTitle}>
          <MapPin size={20} />
          {t('locationSharing')}
        </h2>
        <LocationSharing
          providerId={selectedProvider?.id?.toString()}
          onStatusChange={(enabled) => setIsSharing(enabled)}
        />
      </div>

      {/* Info Cards */}
      <div className={styles.infoGrid}>
        <div className={styles.infoCard}>
          <Clock size={20} />
          <div>
            <h4>{t('updateFrequency')}</h4>
            <p>{t('cityMode')}: 30s</p>
            <p>{t('highwayMode')}: 2min</p>
          </div>
        </div>
        <div className={styles.infoCard}>
          <Navigation size={20} />
          <div>
            <h4>{t('privacy')}</h4>
            <p>{t('privacyNote')}</p>
          </div>
        </div>
      </div>

      {/* Battery Warning */}
      {isSharing && (
        <div className={styles.batteryWarning}>
          <p>{t('batteryWarning')}</p>
        </div>
      )}
    </div>
  );
}
