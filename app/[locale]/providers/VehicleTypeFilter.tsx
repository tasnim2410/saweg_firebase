'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import styles from './VehicleTypeFilter.module.css';

export const VEHICLE_TYPE_OPTIONS = [
  { value: 'شاحنة صندوقية (Van / Box Truck)', imagePath: '/images/van_box_truck.png' },
  { value: 'شاحنة مسطحة (Flatbed Truck)', imagePath: '/images/flatbed_truck.png' },
  { value: 'شاحنة مبردة (Reefer Truck)', imagePath: '/images/reefer_truck.png' },
  { value: 'شاحنة قلابة (Dump Truck / Tipper)', imagePath: '/images/dump_truck_tipper.png' },
  { value: 'شاحنة مغطاة (Curtainsider)', imagePath: '/images/curtainsider.png' },
  { value: 'شاحنة صهريج (Tanker Truck)', imagePath: '/images/tanker_truck.png' },
  { value: 'شاحنة برافعة خلفية (Tail-lift Truck)', imagePath: '/images/tail_lift_truck.png' },
  { value: 'شاحنة رافعة (Crane Truck)', imagePath: '/images/crane_truck.png' },
  { value: 'شاحنة صندوقية بجوانب قابلة للطي (Drop-side Truck)', imagePath: '/images/drop_side_truck.png' },
  { value: 'شاحنة حاويات/شاسيه حامل حاويات (Container Truck)', imagePath: '/images/container_truck.png' },
  { value: 'شاحنة صهريج أغذية (Food Grade Tanker)', imagePath: '/images/food_grade_tranker.png' },
  { value: 'نصف مقطورة مجرورة(semi Trailer)', imagePath: '/images/semi_trailer.png' },
] as const;

export type VehicleType = typeof VEHICLE_TYPE_OPTIONS[number]['value'];

interface VehicleTypeFilterProps {
  selectedTypes: VehicleType[];
  onChange: (types: VehicleType[]) => void;
  onClear: () => void;
}

export default function VehicleTypeFilter({ selectedTypes, onChange, onClear }: VehicleTypeFilterProps) {
  const locale = useLocale();
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

  const toggleType = (value: VehicleType) => {
    const newSelection = selectedTypes.includes(value)
      ? selectedTypes.filter(t => t !== value)
      : [...selectedTypes, value];
    onChange(newSelection);
  };

  const selectAll = () => {
    onChange(VEHICLE_TYPE_OPTIONS.map(o => o.value));
  };

  const hasSelection = selectedTypes.length > 0;
  const isAllSelected = selectedTypes.length === VEHICLE_TYPE_OPTIONS.length;

  return (
    <div className={styles.filterContainer} ref={containerRef}>
      <label className={styles.filterLabel}>
        {locale === 'ar' ? 'تصفية حسب نوع المركبة' : 'Filter by vehicle type'}
      </label>
      
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
                ? `${selectedTypes.length} نوع محدد`
                : `${selectedTypes.length} type${selectedTypes.length > 1 ? 's' : ''} selected`
              : locale === 'ar'
                ? 'اختر نوع المركبة'
                : 'Choose vehicle type'}
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
            {VEHICLE_TYPE_OPTIONS.map((option) => {
              const isSelected = selectedTypes.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}
                  onClick={() => toggleType(option.value)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <img
                    src={option.imagePath}
                    alt={option.value}
                    className={styles.optionImage}
                    loading="lazy"
                  />
                  <span className={styles.optionText}>{option.value}</span>
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
