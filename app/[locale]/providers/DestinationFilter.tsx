'use client';

import { useLocale } from 'next-intl';
import { useMemo, useState, useRef, useEffect } from 'react';
import { MapPin, X } from 'lucide-react';
import styles from './DestinationFilter.module.css';
import { getLocationOptionGroups } from '@/lib/locations';
import SearchableCitySelect from '@/components/SearchableCitySelect';

interface Props {
  selectedDestinations: string[];
  onChange: (destinations: string[]) => void;
  onClear: () => void;
}

export default function DestinationFilter({ selectedDestinations, onChange, onClear }: Props) {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const rootRef = useRef<HTMLDivElement>(null);
  const [tempSelection, setTempSelection] = useState<string | null>(null);

  const locationGroups = useMemo(() => getLocationOptionGroups(locale === 'ar' ? 'ar' : 'en'), [locale]);

  // Flatten all options for easy lookup
  const allOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = [];
    locationGroups.forEach((group) => {
      group.options.forEach((opt) => {
        options.push(opt);
      });
    });
    return options;
  }, [locationGroups]);

  // Get selected labels
  const selectedLabels = useMemo(() => {
    return selectedDestinations
      .map((value) => allOptions.find((o) => o.value === value)?.label)
      .filter(Boolean) as string[];
  }, [selectedDestinations, allOptions]);

  const handleAddDestination = (value: string | null) => {
    if (value && !selectedDestinations.includes(value)) {
      onChange([...selectedDestinations, value]);
      setTempSelection(null);
    }
  };

  const handleRemoveDestination = (value: string) => {
    onChange(selectedDestinations.filter((v) => v !== value));
  };

  return (
    <div className={styles.filterContainer} ref={rootRef} data-destination-root="true">
      <div className={styles.filterHeader}>
        <div className={styles.filterIcon}>
          <MapPin size={18} />
        </div>
        <label className={styles.filterLabel}>
          {isRTL ? 'الوجهة' : 'Destination'}
        </label>
        {selectedDestinations.length > 0 && (
          <span className={styles.filterBadge}>{selectedDestinations.length}</span>
        )}
      </div>

      <div className={styles.controls}>
        <div className={styles.searchContainer}>
          <SearchableCitySelect
            value={tempSelection}
            onChange={handleAddDestination}
            locale={locale as 'ar' | 'en'}
            placeholder={isRTL ? 'ابحث وأضف مدينة...' : 'Search and add a city...'}
          />
        </div>

        {selectedDestinations.length > 0 && (
          <button type="button" className={styles.clearButton} onClick={onClear}>
            {isRTL ? 'مسح' : 'Clear'}
          </button>
        )}
      </div>

      {selectedDestinations.length > 0 && (
        <div className={styles.selectedTags}>
          {selectedDestinations.map((value) => {
            const label = allOptions.find((o) => o.value === value)?.label || value;
            return (
              <div key={value} className={styles.tag}>
                <span className={styles.tagLabel}>{label}</span>
                <button
                  type="button"
                  className={styles.tagRemove}
                  onClick={() => handleRemoveDestination(value)}
                  aria-label={isRTL ? 'إزالة' : 'Remove'}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
