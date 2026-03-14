'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import Footer from '@/components/Footer';
import HomeAdvancedFilters from '@/components/HomeAdvancedFilters';
import VehicleTypeSlider from '@/components/VehicleTypeSlider';
import styles from './ProvidersPage.module.css';
import { VehicleType, VEHICLE_TYPE_OPTIONS } from './VehicleTypeFilter';
import { MaxChargeValue, MAX_CHARGE_OPTIONS } from './MaxChargeFilter';
import { DistanceValue, DistanceSource, DISTANCE_OPTIONS } from './DistanceFilter';
import { getLocationCoordinates, calculateDistance, isWithinDistance } from '@/lib/distance';
import { getLocationLabel } from '@/lib/locations';

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
  
  // Vehicle type slider selection
  const [selectedVehicleTypeSlider, setSelectedVehicleTypeSlider] = useState<string | null>(null);

  // Handle vehicle type slider changes
  useEffect(() => {
    if (selectedVehicleTypeSlider) {
      // When a vehicle type is selected from slider, add it to pending filters
      if (!pendingVehicleTypes.includes(selectedVehicleTypeSlider as VehicleType)) {
        setPendingVehicleTypes([selectedVehicleTypeSlider as VehicleType]);
        setHasPendingChanges(true);
      }
    } else {
      // When cleared, remove from pending filters
      setPendingVehicleTypes([]);
      setHasPendingChanges(true);
    }
  }, [selectedVehicleTypeSlider]);
  
  // Pending filter states (what user has selected but not applied)
  const [pendingVehicleTypes, setPendingVehicleTypes] = useState<VehicleType[]>([]);
  const [pendingMaxChargeOptions, setPendingMaxChargeOptions] = useState<MaxChargeValue[]>([]);
  const [pendingDistance, setPendingDistance] = useState<DistanceValue | null>(null);
  const [pendingDistanceSource, setPendingDistanceSource] = useState<DistanceSource>('current-location');
  const [pendingDistanceCity, setPendingDistanceCity] = useState<string | null>(null);
  const [pendingCurrentLocation, setPendingCurrentLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [pendingClassifiedCity, setPendingClassifiedCity] = useState<string | null>(null);
  const [pendingDestinations, setPendingDestinations] = useState<string[]>([]);
  
  // Applied filter states (what filters are actually active)
  const [selectedVehicleTypes, setSelectedVehicleTypes] = useState<VehicleType[]>([]);
  const [selectedMaxChargeOptions, setSelectedMaxChargeOptions] = useState<MaxChargeValue[]>([]);
  
  // Distance filter states
  const [selectedDistance, setSelectedDistance] = useState<DistanceValue | null>(null);
  const [distanceSource, setDistanceSource] = useState<DistanceSource>('current-location');
  const [selectedDistanceCity, setSelectedDistanceCity] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [classifiedCity, setClassifiedCity] = useState<string | null>(null);
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [merchantCity, setMerchantCity] = useState<string | null>(null);
  const [distanceFilteredProviders, setDistanceFilteredProviders] = useState<Provider[]>([]);
  const [isCalculatingDistances, setIsCalculatingDistances] = useState(false);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const [appliedDistanceFilter, setAppliedDistanceFilter] = useState<{
    distance: DistanceValue | null;
    source: DistanceSource;
    city: string | null;
    location: { lat: number; lon: number } | null;
    classifiedCity: string | null;
  } | null>(null);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

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
          setPendingVehicleTypes(validTypes);
        }
        if (parsed.selectedMaxCharge && Array.isArray(parsed.selectedMaxCharge)) {
          const validMaxCharge = parsed.selectedMaxCharge.filter((v: string) =>
            MAX_CHARGE_OPTIONS.some(o => o.value === v)
          );
          setSelectedMaxChargeOptions(validMaxCharge);
          setPendingMaxChargeOptions(validMaxCharge);
        }
        if (parsed.selectedDistance) {
          const validDistance = DISTANCE_OPTIONS.some(o => o.value === parsed.selectedDistance)
            ? parsed.selectedDistance
            : null;
          setSelectedDistance(validDistance);
          setPendingDistance(validDistance);
        }
        if (parsed.distanceSource) {
          setDistanceSource(parsed.distanceSource as DistanceSource);
          setPendingDistanceSource(parsed.distanceSource as DistanceSource);
        }
        if (parsed.classifiedCity) {
          setClassifiedCity(parsed.classifiedCity);
          setPendingClassifiedCity(parsed.classifiedCity);
        }
        if (parsed.selectedDestinations && Array.isArray(parsed.selectedDestinations)) {
          const validDests = parsed.selectedDestinations.filter((d: string) => typeof d === 'string');
          setSelectedDestinations(validDests);
          setPendingDestinations(validDests);
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
        distanceSource: distanceSource,
        selectedDistanceCity: selectedDistanceCity,
        classifiedCity: classifiedCity,
        selectedDestinations: selectedDestinations,
      }));
    } catch {
      // Ignore localStorage errors
    }
  }, [selectedVehicleTypes, selectedMaxChargeOptions, selectedDistance, distanceSource, selectedDistanceCity, classifiedCity, selectedDestinations]);

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
        setDistanceFilteredProviders(data); // Initialize with all providers
      } catch {
        setError('Failed to load');
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, []);

  // Calculate distances only when explicitly applied
  const handleApplyDistanceFilter = useCallback(() => {
    setAppliedDistanceFilter({
      distance: selectedDistance,
      source: distanceSource,
      city: selectedDistanceCity,
      location: currentLocation,
      classifiedCity: classifiedCity,
    });
  }, [selectedDistance, distanceSource, selectedDistanceCity, currentLocation, classifiedCity]);

  // Apply all filters at once
  const handleApplyAllFilters = useCallback(async () => {
    setIsApplyingFilters(true);
    // Copy pending states to applied states
    setSelectedVehicleTypes(pendingVehicleTypes);
    setSelectedMaxChargeOptions(pendingMaxChargeOptions);
    setSelectedDestinations(pendingDestinations);
    
    // Update distance filter states
    setSelectedDistance(pendingDistance);
    setDistanceSource(pendingDistanceSource);
    setSelectedDistanceCity(pendingDistanceCity);
    setCurrentLocation(pendingCurrentLocation);
    setClassifiedCity(pendingClassifiedCity);
    
    // Apply distance filter calculation
    setAppliedDistanceFilter({
      distance: pendingDistance,
      source: pendingDistanceSource,
      city: pendingDistanceCity,
      location: pendingCurrentLocation,
      classifiedCity: pendingClassifiedCity,
    });
    
    setHasPendingChanges(false);

    // If distance isn't active, applying finishes immediately (no async distance calculation)
    if (!pendingDistance || pendingDistance === 'any') {
      setIsApplyingFilters(false);
    }
  }, [pendingVehicleTypes, pendingMaxChargeOptions, pendingDestinations, pendingDistance, pendingDistanceSource, pendingDistanceCity, pendingCurrentLocation, pendingClassifiedCity]);

  const handleClearAllFilters = useCallback(() => {
    setIsApplyingFilters(false);
    setPendingVehicleTypes([]);
    setPendingMaxChargeOptions([]);
    setPendingDistance(null);
    setPendingDistanceSource('current-location');
    setPendingDistanceCity(null);
    setPendingCurrentLocation(null);
    setPendingClassifiedCity(null);
    setPendingDestinations([]);
    
    setSelectedVehicleTypes([]);
    setSelectedMaxChargeOptions([]);
    setSelectedDistance(null);
    setDistanceSource('current-location');
    setSelectedDistanceCity(null);
    setCurrentLocation(null);
    setClassifiedCity(null);
    setSelectedDestinations([]);
    setAppliedDistanceFilter(null);
    setHasPendingChanges(false);
  }, []);

  // Effect to calculate distances when applied filter changes
  useEffect(() => {
    const calculateDistances = async () => {
      // If no distance filter is applied, use all providers
      if (!appliedDistanceFilter || !appliedDistanceFilter.distance || appliedDistanceFilter.distance === 'any') {
        setDistanceFilteredProviders(providers);
        setIsApplyingFilters(false);
        return;
      }

      const { distance, source, city, location, classifiedCity: appliedClassifiedCity } = appliedDistanceFilter;

      setIsCalculatingDistances(true);

      try {
        // Get reference point based on selected source
        let referenceCoords: { lat: number; lon: number } | null = null;

        if (source === 'selected-city' && city) {
          const coords = await getLocationCoordinates(city);
          if (coords) referenceCoords = coords;
        } else if (source === 'current-location' && location) {
          referenceCoords = location;
        }

        if (!referenceCoords) {
          // Can't calculate distances, fall back to city name matching
          const refCity = source === 'current-location' ? appliedClassifiedCity : city;
          const refCityLower = refCity?.toLowerCase().trim();
          
          const filtered = providers.filter(p => {
            const providerLocation = p.location?.toLowerCase().trim();
            
            if (distance === 'same-city') {
              return providerLocation === refCityLower ||
                providerLocation?.includes(refCityLower || '') ||
                (refCityLower || '').includes(providerLocation || '');
            }
            return true;
          });
          setDistanceFilteredProviders(filtered);
          return;
        }

        // Filter providers by actual distance
        const filtered = await Promise.all(
          providers.map(async (p) => {
            // For same-city, try string matching first
            if (distance === 'same-city') {
              const refCity = source === 'current-location' ? appliedClassifiedCity : city;
              const refCityLower = refCity?.toLowerCase().trim();
              const providerLocation = p.location?.toLowerCase().trim();
              
              const cityMatch = providerLocation === refCityLower ||
                providerLocation?.includes(refCityLower || '') ||
                (refCityLower || '').includes(providerLocation || '');
              
              if (cityMatch) return p;
            }

            // Try to geocode provider location and calculate distance
            const providerCoords = await getLocationCoordinates(p.location);
            if (!providerCoords) {
              // Can't geocode - exclude to avoid false positives (e.g., wrong country)
              return null;
            }

            const dist = calculateDistance(referenceCoords, providerCoords);

            switch (distance) {
              case 'same-city':
                return dist <= 10 ? p : null;
              case 'nearby-30':
                return dist <= 30 ? p : null;
              case 'nearby-50':
                return dist <= 50 ? p : null;
              case 'nearby-100':
                return dist <= 100 ? p : null;
              case 'nearby-150':
                return dist <= 150 ? p : null;
              case 'nearby-200':
                return dist <= 200 ? p : null;
              default:
                return p;
            }
          })
        );

        setDistanceFilteredProviders(filtered.filter((p): p is Provider => p !== null));
      } finally {
        setIsCalculatingDistances(false);
        setIsApplyingFilters(false);
      }
    };

    calculateDistances();
  }, [providers, appliedDistanceFilter, merchantCity]);

  // Combined filter using pre-filtered distance results
  const filteredProviders = useMemo(() => {
    return distanceFilteredProviders.filter(p => {
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
      
      return vehicleMatch && maxChargeMatch && destinationMatch;
    });
  }, [distanceFilteredProviders, selectedVehicleTypes, selectedMaxChargeOptions, selectedDestinations]);

  // Count of compatible shippers
  const compatibleCount = filteredProviders.length;
  const totalCount = providers.length;

  const hasAnyFilter = selectedVehicleTypes.length > 0 || selectedMaxChargeOptions.length > 0 || selectedDistance !== null || selectedDestinations.length > 0;

  // Auto-apply filters when pending changes exist
  useEffect(() => {
    if (hasPendingChanges) {
      // Auto-apply after a short delay to batch rapid changes
      const timer = setTimeout(() => {
        handleApplyAllFilters();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hasPendingChanges, handleApplyAllFilters]);

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

      <VehicleTypeSlider 
        selectedType={selectedVehicleTypeSlider} 
        onSelect={setSelectedVehicleTypeSlider} 
      />

      {/* Advanced Filters - Non-sticky, below car type */}
      <HomeAdvancedFilters 
        sticky={false}
        onFiltersChange={(filters) => {
          setPendingMaxChargeOptions(filters.maxChargeOptions);
          setPendingDistance(filters.distance);
          setPendingDistanceSource(filters.distanceSource);
          setPendingDistanceCity(filters.distanceCity);
          setPendingCurrentLocation(filters.currentLocation);
          setPendingClassifiedCity(filters.classifiedCity);
          setPendingDestinations(filters.destinations);
          setHasPendingChanges(true);
        }}
      />

      <div className={styles.pageContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          
          {/* Counter showing compatible shippers */}
          <div className={styles.counter}>
            {hasAnyFilter ? (
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

        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</span>
          </div>
        ) : isApplyingFilters ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>{locale === 'ar' ? 'جاري تطبيق الفلاتر...' : 'Applying filters...'}</span>
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
              // const isStale = Number.isFinite(lastUpdateMs) ? Date.now() - lastUpdateMs > 24 * 60 * 60 * 1000 : true;
              // const isActive = Boolean(p.active) && !isStale;
              // const isActive = Boolean(p.active); // Only use active flag, ignore 24h check
              const isActive = true; // Force all posts to show as active

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
                          src={vehicleTypeInfo.imageSrc} 
                          alt="" 
                          className={styles.vehicleBadgeImage}
                        />
                        <span className={styles.vehicleBadgeText}>
                          {locale === 'ar' ? vehicleTypeInfo.labelAR : vehicleTypeInfo.labelEN}
                        </span>
                      </div>
                    )}

                    {/* Show max charge badge if available */}
                    {p.user?.maxCharge && (
                      <div className={styles.maxChargeBadge}>
                        <span className={styles.maxChargeIcon}>⚖️</span>
                        <span className={styles.maxChargeText}>
                          {p.user.maxCharge} {' '}
                          {locale === 'ar' 
                            ? (p.user.maxChargeUnit?.toLowerCase().includes('ton') ? 'طن' : 'كغ')
                            : (p.user.maxChargeUnit || 'kg')}
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
                        📍 {getLocationLabel(p.location, locale === 'ar' ? 'ar' : 'en')}
                      </span>
                      {p.destination && (
                        <span className={styles.destinationBadge}>
                          🚛 {getLocationLabel(p.destination, locale === 'ar' ? 'ar' : 'en')}
                        </span>
                      )}
                    </div>

                    <div className={styles.cardActions}>
                      <a
                        href={toTelHref(p.phone)}
                        onClick={() => {
                          void fetch(`/api/providers/${p.id}/calls`, {
                            method: 'POST',
                            keepalive: true,
                          }).catch(() => null);
                        }}
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
