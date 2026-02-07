'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import Footer from '@/components/Footer';
import styles from './ProvidersPage.module.css';
import VehicleTypeFilter, { VehicleType, VEHICLE_TYPE_OPTIONS } from './VehicleTypeFilter';
import MaxChargeFilter, { MaxChargeValue, MAX_CHARGE_OPTIONS } from './MaxChargeFilter';
import DistanceFilter, { DistanceValue, DISTANCE_OPTIONS } from './DistanceFilter';
import DestinationFilter from './DestinationFilter';

interface Provider {
  id: number;
  name: string;
  location: string;
  destination: string | null;
  description: string | null;
  image: string | null;
  phone: string;
  active: boolean;
  lastLocationUpdateAt: string;
  createdAt: string;
  user: {
    fullName: string;
    carKind: string | null;
    maxCharge: string | null;
    maxChargeUnit: string | null;
  } | null;
}

const STORAGE_KEY = 'saweg:providerFilters:v1';

export default function ProvidersPageClient() {
  const locale = useLocale();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicleTypes, setSelectedVehicleTypes] = useState<VehicleType[]>([]);
  const [selectedMaxChargeOptions, setSelectedMaxChargeOptions] = useState<MaxChargeValue[]>([]);
  const [selectedDistance, setSelectedDistance] = useState<DistanceValue | null>(null);
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [merchantCity, setMerchantCity] = useState<string | null>(null);

  // Load saved filters from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.selectedTypes && Array.isArray(parsed.selectedTypes)) {
          const validTypes = parsed.selectedTypes.filter((t: string) =>
            VEHICLE_TYPE_OPTIONS.some(o => o.value === t)
          );
          setSelectedVehicleTypes(validTypes);
        }
        if (parsed.selectedMaxCharge && Array.isArray(parsed.selectedMaxCharge)) {
          const validMaxCharge = parsed.selectedMaxCharge.filter((v: string) =>
            MAX_CHARGE_OPTIONS.some(o => o.value === v)
          );
          setSelectedMaxChargeOptions(validMaxCharge);
        }
        if (parsed.selectedDistance) {
          const validDistance = DISTANCE_OPTIONS.some(o => o.value === parsed.selectedDistance)
            ? parsed.selectedDistance
            : null;
          setSelectedDistance(validDistance);
        }
        if (parsed.selectedDestinations && Array.isArray(parsed.selectedDestinations)) {
          setSelectedDestinations(parsed.selectedDestinations.filter((d: string) => typeof d === 'string'));
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Fetch merchant city from user session
  useEffect(() => {
    const fetchUserCity = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setMerchantCity(data?.merchantCity || null);
        }
      } catch {
        // Ignore errors
      }
    };
    fetchUserCity();
  }, []);

  // Save filters to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        selectedTypes: selectedVehicleTypes,
        selectedMaxCharge: selectedMaxChargeOptions,
        selectedDistance: selectedDistance,
        selectedDestinations: selectedDestinations,
      }));
    } catch {
      // Ignore localStorage errors
    }
  }, [selectedVehicleTypes, selectedMaxChargeOptions, selectedDistance, selectedDestinations]);

  // Fetch providers
  useEffect(() => {
    const fetchProviders = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/providers', { cache: 'no-store' });
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

    fetchProviders();
  }, []);

  // Filter providers based on selected vehicle types, max charge, and distance
  const filteredProviders = useMemo(() => {
    return providers.filter(p => {
      // Vehicle type filter
      const vehicleMatch = selectedVehicleTypes.length === 0 || 
        (p.user?.carKind && selectedVehicleTypes.includes(p.user.carKind as VehicleType));
      
      // Max charge filter
      let maxChargeMatch = true;
      if (selectedMaxChargeOptions.length > 0) {
        const providerMaxCharge = p.user?.maxCharge;
        if (!providerMaxCharge) {
          maxChargeMatch = false;
        } else {
          const chargeValue = parseFloat(providerMaxCharge);
          if (!isNaN(chargeValue)) {
            // Convert to kg if unit is tons
            const unit = p.user?.maxChargeUnit?.toLowerCase() || 'kg';
            const chargeInKg = unit.includes('ton') ? chargeValue * 1000 : chargeValue;
            
            maxChargeMatch = selectedMaxChargeOptions.some(optionValue => {
              const option = MAX_CHARGE_OPTIONS.find(o => o.value === optionValue);
              if (!option) return false;
              return chargeInKg >= option.min && chargeInKg < option.max;
            });
          } else {
            maxChargeMatch = false;
          }
        }
      }
      
      // Distance filter - simplified version based on city matching
      let distanceMatch = true;
      if (selectedDistance && selectedDistance !== 'any' && merchantCity) {
        const providerLocation = p.location?.toLowerCase().trim();
        const merchantCityLower = merchantCity.toLowerCase().trim();
        
        if (selectedDistance === 'same-city') {
          // Exact city match
          distanceMatch = providerLocation === merchantCityLower ||
            providerLocation?.includes(merchantCityLower) ||
            merchantCityLower?.includes(providerLocation || '');
        } else if (selectedDistance === 'nearby-50') {
          // For now, same city + some nearby (simplified)
          // TODO: Implement proper geocoding for accurate distances
          distanceMatch = providerLocation === merchantCityLower ||
            providerLocation?.includes(merchantCityLower) ||
            merchantCityLower?.includes(providerLocation || '');
        } else if (selectedDistance === 'nearby-100') {
          // For now, same city + nearby cities (simplified)
          // TODO: Implement proper geocoding for accurate distances
          distanceMatch = true; // Accept all for 100km range until geocoding is implemented
        }
      }
      // Destination filter
      let destinationMatch = true;
      if (selectedDestinations.length > 0) {
        const providerDestination = p.destination?.toLowerCase().trim();
        if (!providerDestination) {
          destinationMatch = false;
        } else {
          destinationMatch = selectedDestinations.some(destValue => 
            providerDestination === destValue.toLowerCase() ||
            providerDestination.includes(destValue.toLowerCase()) ||
            destValue.toLowerCase().includes(providerDestination)
          );
        }
      }
      
      return vehicleMatch && maxChargeMatch && distanceMatch && destinationMatch;
    });
  }, [providers, selectedVehicleTypes, selectedMaxChargeOptions, selectedDistance, merchantCity, selectedDestinations]);

  // Count of compatible shippers
  const compatibleCount = filteredProviders.length;
  const totalCount = providers.length;

  const hasAnyFilter = selectedVehicleTypes.length > 0 || selectedMaxChargeOptions.length > 0 || selectedDistance !== null || selectedDestinations.length > 0;

  const handleClearAllFilters = () => {
    setSelectedVehicleTypes([]);
    setSelectedMaxChargeOptions([]);
    setSelectedDistance(null);
    setSelectedDestinations([]);
  };

  const toTelHref = (phoneNumber: string) => {
    const normalized = String(phoneNumber || '').replace(/[^+\d]/g, '');
    return `tel:${normalized}`;
  };

  const timeAgoLabelFromMs = (ms: number) => {
    if (!Number.isFinite(ms)) return '';
    const diffMs = Date.now() - ms;
    if (!Number.isFinite(diffMs) || diffMs < 0) return '';
    const minutes = Math.floor(diffMs / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const isAr = locale === 'ar';
    if (minutes < 1) return isAr ? 'الآن' : 'now';
    if (minutes < 60) return isAr ? `منذ ${minutes} دقيقة` : `${minutes}m ago`;
    if (hours < 24) return isAr ? `منذ ${hours} ساعة` : `${hours}h ago`;
    if (days < 7) return isAr ? `منذ ${days} يوم` : `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return isAr ? `منذ ${weeks} أسبوع` : `${weeks}w ago`;
    const months = Math.floor(days / 30);
    return isAr ? `منذ ${months} شهر` : `${months}mo ago`;
  };

  const title = locale === 'ar' ? 'كل عروض السوّاق' : 'All shippers offers';
  const arrow = locale === 'ar' ? '→' : '←';

  return (
    <main className={styles.main}>
      <Link 
        href={`/${locale}`} 
        className={styles.backButton} 
        aria-label={locale === 'ar' ? 'الرجوع إلى الرئيسية' : 'Back to home'}
      >
        {arrow}
      </Link>

      <div className={styles.pageContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          
          {/* Counter showing compatible shippers */}
          <div className={styles.counter}>
            {selectedVehicleTypes.length > 0 ? (
              <>
                <span className={styles.counterHighlight}>{compatibleCount}</span>
                <span className={styles.counterText}>
                  {locale === 'ar' 
                    ? ` / ${totalCount} ${compatibleCount === 1 ? 'سائق متوافق' : 'سائقين متوافقين'} `
                    : ` compatible ${compatibleCount === 1 ? 'shipper' : 'shippers'} of ${totalCount}`}
                </span>
                {compatibleCount === 0 && (
                  <span className={styles.noResults}>
                    {locale === 'ar' 
                      ? ' - حاول تغيير الفلتر'
                      : ' - Try changing filters'}
                  </span>
                )}
              </>
            ) : (
              <span className={styles.counterText}>
                {locale === 'ar' 
                  ? `${totalCount} ${totalCount === 1 ? 'عرض' : 'عروض'}`
                  : `${totalCount} ${totalCount === 1 ? 'offer' : 'offers'}`}
              </span>
            )}
          </div>
        </div>

        {/* Vehicle Type Filter */}
        <div className={styles.filtersContainer}>
          <div className={styles.filterColumn}>
            <VehicleTypeFilter
              selectedTypes={selectedVehicleTypes}
              onChange={setSelectedVehicleTypes}
              onClear={() => setSelectedVehicleTypes([])}
            />
          </div>
          <div className={styles.filterColumn}>
            <MaxChargeFilter
              selectedOptions={selectedMaxChargeOptions}
              onChange={setSelectedMaxChargeOptions}
              onClear={() => setSelectedMaxChargeOptions([])}
            />
          </div>
          <div className={styles.filterColumn}>
            <DistanceFilter
              selectedOption={selectedDistance}
              onChange={setSelectedDistance}
              onClear={() => setSelectedDistance(null)}
              merchantCity={merchantCity}
            />
          </div>
          <div className={styles.filterColumn}>
            <DestinationFilter
              selectedDestinations={selectedDestinations}
              onChange={setSelectedDestinations}
              onClear={() => setSelectedDestinations([])}
            />
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</span>
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🔍</div>
            <p className={styles.emptyText}>
              {hasAnyFilter
                ? (locale === 'ar' 
                    ? 'لا توجد نتائج مطابقة للفلتر المحدد'
                    : 'No results match the selected filter')
                : (locale === 'ar' 
                    ? 'لا توجد عروض متاحة'
                    : 'No offers available')}
            </p>
            {hasAnyFilter && (
              <button className={styles.clearFiltersButton} onClick={handleClearAllFilters}>
                {locale === 'ar' ? 'مسح الفلتر' : 'Clear filters'}
              </button>
            )}
          </div>
        ) : (
          <div className={styles.grid}>
            {filteredProviders.map((p) => {
              const createdAtMs = p.createdAt ? new Date(p.createdAt).getTime() : NaN;
              const timeAgo = timeAgoLabelFromMs(createdAtMs);

              const lastUpdateMs = p.lastLocationUpdateAt ? new Date(p.lastLocationUpdateAt).getTime() : NaN;
              const isStale = Number.isFinite(lastUpdateMs) ? Date.now() - lastUpdateMs > 24 * 60 * 60 * 1000 : true;
              const isActive = Boolean(p.active) && !isStale;

              // Get vehicle type info
              const carKind = p.user?.carKind;
              const vehicleTypeInfo = carKind ? VEHICLE_TYPE_OPTIONS.find(o => o.value === carKind) : null;

              return (
                <div key={p.id} className={`${styles.card} ${!isActive ? styles.cardInactive : ''}`}>
                  <Link href={`/${locale}/providers/${p.id}`} className={styles.cardImageLink}>
                    <img
                      src={p.image || 'https://via.placeholder.com/520x340/F3F3F3/666666?text=Truck'}
                      alt={p.name}
                      className={styles.cardImage}
                    />
                    {timeAgo && <span className={styles.timeBadge}>{timeAgo}</span>}
                    {!isActive && (
                      <span className={styles.inactiveOverlay}>
                        {locale === 'ar' ? 'غير نشط' : 'Inactive'}
                      </span>
                    )}
                  </Link>

                  <div className={styles.cardBody}>
                    <h3 className={styles.cardTitle}>{p.name}</h3>
                    
                    {/* Show vehicle type badge if available */}
                    {vehicleTypeInfo && (
                      <div className={styles.vehicleBadge}>
                        <img 
                          src={vehicleTypeInfo.imagePath} 
                          alt="" 
                          className={styles.vehicleBadgeImage}
                        />
                        <span className={styles.vehicleBadgeText}>{carKind}</span>
                      </div>
                    )}

                    {/* Show max charge badge if available */}
                    {p.user?.maxCharge && (
                      <div className={styles.maxChargeBadge}>
                        <span className={styles.maxChargeIcon}>⚖️</span>
                        <span className={styles.maxChargeText}>
                          {p.user.maxCharge} {p.user.maxChargeUnit || (locale === 'ar' ? 'كغ' : 'kg')}
                        </span>
                      </div>
                    )}

                    {p.description && (
                      <p className={styles.cardDescription}>
                        {p.description.length > 120 
                          ? `${p.description.slice(0, 120)}...` 
                          : p.description}
                      </p>
                    )}

                    <div className={styles.cardMeta}>
                      <span className={styles.locationBadge}>
                        📍 {p.location}
                      </span>
                      {p.destination && (
                        <span className={styles.destinationBadge}>
                          🚛 {p.destination}
                        </span>
                      )}
                    </div>

                    <div className={styles.cardActions}>
                      <a
                        href={toTelHref(p.phone)}
                        className={`${styles.callButton} ${isActive ? styles.callButtonActive : styles.callButtonInactive}`}
                      >
                        📞 {locale === 'ar' ? 'اتصال' : 'Call'}
                      </a>
                      <Link 
                        href={`/${locale}/providers/${p.id}`}
                        className={styles.detailsButton}
                      >
                        {locale === 'ar' ? 'التفاصيل' : 'Details'} →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
