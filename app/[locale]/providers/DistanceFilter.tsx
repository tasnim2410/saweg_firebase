'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { Navigation } from 'lucide-react';
import styles from './DistanceFilter.module.css';
import { getLocationLabel, LOCATION_OPTIONS } from '@/lib/locations';
import { getCurrentPosition, findNearestCity } from '@/lib/distance';
import SearchableCitySelect from '@/components/SearchableCitySelect';

export type DistanceValue = 'same-city' | 'nearby-30' | 'nearby-50' | 'nearby-100' | 'nearby-150' | 'nearby-200' | 'any';
export type DistanceSource = 'current-location' | 'selected-city';

export const DISTANCE_OPTIONS: Array<{ value: DistanceValue; labelAR: string; labelEN: string; km: number }> = [
  { value: 'same-city', labelAR: 'نفس المدينة', labelEN: 'Same city', km: 0 },
  { value: 'nearby-30', labelAR: '30 كم', labelEN: '30 km', km: 30 },
  { value: 'nearby-50', labelAR: '50 كم', labelEN: '50 km', km: 50 },
  { value: 'nearby-100', labelAR: '100 كم', labelEN: '100 km', km: 100 },
  { value: 'nearby-150', labelAR: '150 كم', labelEN: '150 km', km: 150 },
  { value: 'nearby-200', labelAR: '200 كم', labelEN: '200 km', km: 200 },
  { value: 'any', labelAR: 'أي مسافة', labelEN: 'Any distance', km: 999 },
];

interface Props {
  selectedOption: DistanceValue | null;
  onChange: (value: DistanceValue | null) => void;
  onClear: () => void;
  merchantCity: string | null;
  distanceSource: DistanceSource;
  onSourceChange: (source: DistanceSource) => void;
  selectedCity: string | null;
  onSelectedCityChange: (city: string | null) => void;
  currentLocation: { lat: number; lon: number } | null;
  onCurrentLocationChange: (location: { lat: number; lon: number } | null) => void;
  classifiedCity: string | null;
  onClassifiedCityChange: (city: string | null) => void;
}

export default function DistanceFilter({
  selectedOption,
  onChange,
  onClear,
  merchantCity,
  distanceSource,
  onSourceChange,
  selectedCity,
  onSelectedCityChange,
  currentLocation,
  onCurrentLocationChange,
  classifiedCity,
  onClassifiedCityChange,
}: Props) {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const [isOpen, setIsOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);


  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Classify GPS location to nearest city when it changes
  useEffect(() => {
    const classifyLocation = async () => {
      if (distanceSource === 'current-location' && currentLocation) {
        const nearest = await findNearestCity(currentLocation, LOCATION_OPTIONS);
        onClassifiedCityChange(nearest);
      } else if (distanceSource !== 'current-location') {
        onClassifiedCityChange(null);
      }
    };
    classifyLocation();
  }, [currentLocation, distanceSource, onClassifiedCityChange]);

  const handleGetCurrentLocation = async () => {
    setIsLocating(true);
    setLocationError(null);
    try {
      const position = await getCurrentPosition();
      const coords = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      };
      onCurrentLocationChange(coords);
      onSourceChange('current-location');
      setIsLocating(false);
      // Find and classify nearest city (async; do not block UI)
      void findNearestCity(coords, LOCATION_OPTIONS)
        .then((nearest) => {
          onClassifiedCityChange(nearest);
        })
        .catch(() => {
          // Ignore classification errors
        });
    } catch (error) {
      setLocationError(
        isRTL
          ? 'تعذر الحصول على موقعك. تأكد من السماح بالوصول إلى الموقع.'
          : 'Could not get your location. Please allow location access.'
      );
    } finally {
      setIsLocating(false);
    }
  };

  const getDisplayLabel = (): string => {
    if (!selectedOption) {
      return isRTL ? 'اختر نطاق المسافة' : 'Choose distance range';
    }
    
    const option = DISTANCE_OPTIONS.find(o => o.value === selectedOption);
    if (!option) return '';
    
    let sourceLabel = '';
    switch (distanceSource) {
      case 'current-location':
        sourceLabel = classifiedCity
          ? ` (${isRTL ? 'من' : 'from'} ${getLocationLabel(classifiedCity, locale as 'ar' | 'en')})`
          : ` (${isRTL ? 'من موقعك' : 'from your location'})`;
        break;
      case 'selected-city':
        sourceLabel = selectedCity 
          ? ` (${isRTL ? 'من' : 'from'} ${getLocationLabel(selectedCity, locale as 'ar' | 'en')})`
          : '';
        break;
    }
    
    return (isRTL ? option.labelAR : option.labelEN) + sourceLabel;
  };

  const canFilter = distanceSource === 'selected-city' ? !!selectedCity : 
                   distanceSource === 'current-location' ? !!currentLocation : false;

  const hasSelection = selectedOption !== null;

  const handleClear = () => {
    onClear();
    setIsOpen(false);
  };

  return (
    <div className={styles.filterContainer} ref={containerRef}>
      <div className={styles.filterHeader}>
        <div className={styles.filterIcon}>
          <Navigation size={18} />
        </div>
        <label className={styles.filterLabel}>
          {isRTL ? 'المسافة' : 'Distance'}
        </label>
        {hasSelection && selectedOption !== 'any' && (
          <span className={styles.filterBadge}>1</span>
        )}
      </div>
      
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.dropdownButton}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
        >
          <span className={styles.buttonText}>{getDisplayLabel()}</span>
          <span className={`${styles.caret} ${isOpen ? styles.caretOpen : ''}`}>▼</span>
        </button>

        {hasSelection && (
          <button type="button" className={styles.clearButton} onClick={handleClear}>
            {isRTL ? 'مسح' : 'Clear'}
          </button>
        )}
      </div>

      {isOpen && (
        <div className={styles.dropdown}>
          {/* Source Selector */}
          <div className={styles.sourceSection}>
            <p className={styles.sourceLabel}>
              {isRTL ? 'حساب المسافة من:' : 'Calculate distance from:'}
            </p>

            <div className={styles.sourceOptions}>
              <label className={styles.sourceOption}>
                <input
                  type="radio"
                  name="distanceSource"
                  value="selected-city"
                  checked={distanceSource === 'selected-city'}
                  onChange={() => onSourceChange('selected-city')}
                />
                <span className={styles.sourceRadio} />
                <span className={styles.sourceText}>
                  {isRTL ? 'مدينة محددة' : 'Specific city'}
                </span>
              </label>

              <label className={styles.sourceOption}>
                <input
                  type="radio"
                  name="distanceSource"
                  value="current-location"
                  checked={distanceSource === 'current-location'}
                  onChange={handleGetCurrentLocation}
                  disabled={isLocating}
                />
                <span className={styles.sourceRadio} />
                <span className={styles.sourceText}>
                  {isLocating 
                    ? (isRTL ? 'جاري تحديد الموقع...' : 'Getting location...')
                    : (isRTL ? 'موقعي الحالي 📍' : 'My current location 📍')}
                  {classifiedCity && distanceSource === 'current-location' && (
                    <span className={styles.sourceDetail}>
                      {' '} - {isRTL ? 'أقرب مدينة:' : 'Nearest city:'} {getLocationLabel(classifiedCity, locale as 'ar' | 'en')}
                    </span>
                  )}
                </span>
              </label>
            </div>

            {locationError && (
              <p className={styles.locationError}>{locationError}</p>
            )}
          </div>

          {/* City Selector (when selected-city is chosen) */}
          {distanceSource === 'selected-city' && (
            <div className={styles.citySelector}>
              <SearchableCitySelect
                value={selectedCity}
                onChange={onSelectedCityChange}
                locale={locale as 'ar' | 'en'}
                placeholder={isRTL ? 'ابحث عن مدينة...' : 'Search for a city...'}
              />
            </div>
          )}

          {/* Warning messages */}
          {!canFilter && distanceSource === 'selected-city' && !selectedCity && (
            <p className={styles.noCityWarning}>
              {isRTL ? 'يرجى اختيار مدينة من القائمة' : 'Please select a city from the list'}
            </p>
          )}

          {/* Distance Slider */}
          <div className={styles.sliderSection}>
            <label className={styles.sliderLabel}>
              {isRTL ? 'نطاق المسافة' : 'Distance range'}
            </label>
            <input
              type="range"
              min="0"
              max="6"
              step="1"
              value={DISTANCE_OPTIONS.findIndex(opt => opt.value === selectedOption) || 0}
              onChange={(e) => {
                const index = parseInt(e.target.value);
                onChange(DISTANCE_OPTIONS[index].value);
              }}
              disabled={!canFilter}
              className={styles.slider}
            />
            <div className={styles.sliderLabels}>
              <span>{isRTL ? 'نفس المدينة' : 'Same city'}</span>
              <span>{isRTL ? 'أي مسافة' : 'Any distance'}</span>
            </div>
            {selectedOption && (
              <div className={styles.sliderValue}>
                {isRTL ? DISTANCE_OPTIONS.find(o => o.value === selectedOption)?.labelAR : DISTANCE_OPTIONS.find(o => o.value === selectedOption)?.labelEN}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
