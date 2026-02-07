'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Scale } from 'lucide-react';
import styles from './MaxChargeFilter.module.css';

export const MAX_CHARGE_OPTIONS = [
  { value: '1', labelAR: 'حتى 1 طن', labelEN: 'Up to 1 ton', min: 0, max: 1000 },
  { value: '2', labelAR: '1 - 3 طن', labelEN: '1 - 3 tons', min: 1000, max: 3000 },
  { value: '3', labelAR: '3 - 5 طن', labelEN: '3 - 5 tons', min: 3000, max: 5000 },
  { value: '4', labelAR: '5 - 10 طن', labelEN: '5 - 10 tons', min: 5000, max: 10000 },
  { value: '5', labelAR: '10 - 20 طن', labelEN: '10 - 20 tons', min: 10000, max: 20000 },
  { value: '6', labelAR: 'أكثر من 20 طن', labelEN: 'More than 20 tons', min: 20000, max: Infinity },
] as const;

export type MaxChargeValue = typeof MAX_CHARGE_OPTIONS[number]['value'];

interface MaxChargeFilterProps {
  selectedOptions: MaxChargeValue[];
  onChange: (options: MaxChargeValue[]) => void;
  onClear: () => void;
}

export default function MaxChargeFilter({ selectedOptions, onChange, onClear }: MaxChargeFilterProps) {
  const locale = useLocale();
  const t = useTranslations('providerDashboard');
  const [isOpen, setIsOpen] = useState(false);
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

  const toggleOption = (value: MaxChargeValue) => {
    const newSelection = selectedOptions.includes(value)
      ? selectedOptions.filter(o => o !== value)
      : [...selectedOptions, value];
    onChange(newSelection);
  };

  const selectAll = () => {
    onChange(MAX_CHARGE_OPTIONS.map(o => o.value));
  };

  const hasSelection = selectedOptions.length > 0;
  const isAllSelected = selectedOptions.length === MAX_CHARGE_OPTIONS.length;

  return (
    <div className={styles.filterContainer} ref={containerRef}>
      <div className={styles.filterHeader}>
        <div className={styles.filterIcon}>
          <Scale size={18} />
        </div>
        <label className={styles.filterLabel}>
          {locale === 'ar' ? 'الحمولة القصوى' : 'Max Charge'}
        </label>
        {hasSelection && (
          <span className={styles.filterBadge}>{selectedOptions.length}</span>
        )}
      </div>
      
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.dropdownButton}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
        >
          <span className={styles.buttonText}>
            {hasSelection
              ? locale === 'ar' 
                ? `${selectedOptions.length} نطاق محدد`
                : `${selectedOptions.length} range${selectedOptions.length > 1 ? 's' : ''} selected`
              : locale === 'ar'
                ? 'اختر نطاق الحمولة'
                : 'Select charge range'}
          </span>
          <span className={`${styles.caret} ${isOpen ? styles.caretOpen : ''}`}>▼</span>
        </button>

        {hasSelection && (
          <button type="button" className={styles.clearButton} onClick={onClear}>
            {locale === 'ar' ? 'مسح' : 'Clear'}
          </button>
        )}
      </div>

      {isOpen && (
        <div className={styles.dropdown} role="listbox">
          <div className={styles.selectAllRow}>
            <button
              type="button"
              className={styles.selectAllButton}
              onClick={isAllSelected ? onClear : selectAll}
            >
              {isAllSelected 
                ? (locale === 'ar' ? 'إلغاء تحديد الكل' : 'Deselect all')
                : (locale === 'ar' ? 'تحديد الكل' : 'Select all')}
            </button>
          </div>
          
          <div className={styles.optionsList}>
            {MAX_CHARGE_OPTIONS.map((option) => {
              const isSelected = selectedOptions.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}
                  onClick={() => toggleOption(option.value)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className={styles.optionIcon}>⚖️</span>
                  <span className={styles.optionText}>
                    {locale === 'ar' ? option.labelAR : option.labelEN}
                  </span>
                  <span className={`${styles.checkmark} ${isSelected ? styles.checkmarkVisible : ''}`}>
                    ✓
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
