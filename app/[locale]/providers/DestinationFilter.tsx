'use client';

import { useLocale } from 'next-intl';
import { useMemo, useState, useRef, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import styles from './DestinationFilter.module.css';
import { getLocationOptionGroups } from '@/lib/locations';

interface Props {
  selectedDestinations: string[];
  onChange: (destinations: string[]) => void;
  onClear: () => void;
}

export default function DestinationFilter({ selectedDestinations, onChange, onClear }: Props) {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown on outside click and Escape
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (!target.closest('[data-destination-root="true"]')) {
        setOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const toggleDestination = (value: string) => {
    if (selectedDestinations.includes(value)) {
      onChange(selectedDestinations.filter((v) => v !== value));
    } else {
      onChange([...selectedDestinations, value]);
    }
  };

  const displayText =
    selectedDestinations.length === 0
      ? isRTL
        ? 'اختر الوجهة'
        : 'Choose destination'
      : selectedLabels.join(', ');

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
        <button
          type="button"
          className={`${styles.dropdownButton} ${open ? styles.open : ''}`}
          aria-haspopup="listbox"
          aria-expanded={open ? 'true' : 'false'}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={selectedDestinations.length === 0 ? styles.placeholder : styles.value}>
            {displayText.length > 40 ? displayText.slice(0, 40) + '...' : displayText}
          </span>
          <span className={styles.caret}>{open ? '▲' : '▼'}</span>
        </button>

        {selectedDestinations.length > 0 && (
          <button type="button" className={styles.clearButton} onClick={onClear}>
            {isRTL ? 'مسح' : 'Clear'}
          </button>
        )}
      </div>

      {open && (
        <div className={styles.popover} role="listbox">
          {locationGroups.map((group) => (
            <div key={group.label} className={styles.group}>
              <div className={styles.groupLabel}>{group.label}</div>
              {group.options.map((opt) => {
                const isSelected = selectedDestinations.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.option} ${isSelected ? styles.selected : ''}`}
                    role="option"
                    aria-selected={isSelected ? 'true' : 'false'}
                    onClick={() => toggleDestination(opt.value)}
                  >
                    <span className={styles.check}>{isSelected ? '✓' : ''}</span>
                    <span className={styles.label}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
