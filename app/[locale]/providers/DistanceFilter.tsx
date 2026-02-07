'use client';

import { useLocale } from 'next-intl';
import styles from './DistanceFilter.module.css';

export type DistanceValue = 'same-city' | 'nearby-50' | 'nearby-100' | 'any';

export const DISTANCE_OPTIONS: Array<{ value: DistanceValue; labelAR: string; labelEN: string }> = [
  { value: 'same-city', labelAR: 'نفس المدينة', labelEN: 'Same city' },
  { value: 'nearby-50', labelAR: 'أقل من 50 كم', labelEN: 'Less than 50 km' },
  { value: 'nearby-100', labelAR: 'أقل من 100 كم', labelEN: 'Less than 100 km' },
  { value: 'any', labelAR: 'أي مسافة', labelEN: 'Any distance' },
];

interface Props {
  selectedOption: DistanceValue | null;
  onChange: (value: DistanceValue | null) => void;
  onClear: () => void;
  merchantCity: string | null;
}

export default function DistanceFilter({ selectedOption, onChange, onClear, merchantCity }: Props) {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const selectedLabel = selectedOption
    ? DISTANCE_OPTIONS.find((o) => o.value === selectedOption)?.[isRTL ? 'labelAR' : 'labelEN']
    : null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          {isRTL ? '📍 المسافة من مدينتك' : '📍 Distance from your city'}
        </h3>
        {selectedOption && (
          <button type="button" className={styles.clearButton} onClick={onClear}>
            {isRTL ? 'مسح' : 'Clear'}
          </button>
        )}
      </div>

      {!merchantCity && (
        <p className={styles.noCityWarning}>
          {isRTL 
            ? 'يرجى تحديث مدينتك في الملف الشخصي لاستخدام فلتر المسافة'
            : 'Please update your city in your profile to use distance filter'}
        </p>
      )}

      <div className={styles.optionsGrid}>
        {DISTANCE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`${styles.option} ${selectedOption === option.value ? styles.selected : ''}`}
            onClick={() => onChange(option.value === selectedOption ? null : option.value)}
            disabled={!merchantCity && option.value !== 'any'}
          >
            <span className={styles.check}>
              {selectedOption === option.value ? '✓' : ''}
            </span>
            <span className={styles.label}>
              {isRTL ? option.labelAR : option.labelEN}
            </span>
          </button>
        ))}
      </div>

      {selectedOption && selectedOption !== 'any' && merchantCity && (
        <p className={styles.activeFilter}>
          {isRTL 
            ? `تبحث في: ${merchantCity}`
            : `Searching from: ${merchantCity}`}
        </p>
      )}
    </div>
  );
}
