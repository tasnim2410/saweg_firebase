'use client';

import React, { useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import styles from './VehicleTypeSlider.module.css';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface VehicleType {
  id: string;
  labelAR: string;
  labelEN: string;
  iconPath: string;
}

const VEHICLE_TYPES: VehicleType[] = [
  { id: 'van-box', labelAR: 'صندوقية', labelEN: 'Van/Box', iconPath: '/images/van_icon.png' },
  { id: 'flatbed', labelAR: 'مسطحة', labelEN: 'Flatbed', iconPath: '/images/flatbet_truck_icon.png' },
  { id: 'reefer', labelAR: 'مبردة', labelEN: 'Reefer', iconPath: '/images/reefer_truck_icon.png' },
  { id: 'dump', labelAR: 'قلابة', labelEN: 'Dump', iconPath: '/images/dump_truck_icon.png' },
  { id: 'curtainsider', labelAR: 'مغطاة', labelEN: 'Curtainsider', iconPath: '/images/curtainsider_icon.png' },
  { id: 'tanker', labelAR: 'صهريج', labelEN: 'Tanker', iconPath: '/images/tanker_truck_icon.png' },
  { id: 'tail-lift', labelAR: 'برافعة', labelEN: 'Tail-lift', iconPath: '/images/tail_lift_truck_icon.png' },
  { id: 'crane', labelAR: 'رافعة', labelEN: 'Crane', iconPath: '/images/crane_truck_icon.png' },
  { id: 'drop-side', labelAR: 'جوانب قابلة', labelEN: 'Drop-side', iconPath: '/images/drop_side_truck_icon.png' },
  { id: 'container', labelAR: 'حاويات', labelEN: 'Container', iconPath: '/images/container_truck_icon.png' },
  { id: 'semi-trailer', labelAR: 'نصف مقطورة', labelEN: 'Semi Trailer', iconPath: '/images/semi_trailer_icon.png' },
];

interface VehicleTypeSliderProps {
  selectedType: string | null;
  onSelect: (typeId: string | null) => void;
}

export default function VehicleTypeSlider({ selectedType, onSelect }: VehicleTypeSliderProps) {
  const locale = useLocale();
  const sliderRef = useRef<HTMLDivElement>(null);
  const isRTL = locale === 'ar';

  const scroll = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = 200;
      const scrollDirection = isRTL ? (direction === 'left' ? 1 : -1) : (direction === 'left' ? -1 : 1);
      sliderRef.current.scrollBy({ left: scrollAmount * scrollDirection, behavior: 'smooth' });
    }
  };

  const handleSelect = (id: string) => {
    if (selectedType === id) {
      onSelect(null); // Deselect if already selected
    } else {
      onSelect(id);
    }
  };

  return (
    <section className={styles.sliderSection}>
      <div className={styles.sliderHeader}>
        <h2 className={styles.sliderTitle}>
          {locale === 'ar' ? 'تصفح حسب نوع المركبة' : 'Browse by Vehicle Type'}
        </h2>
        {selectedType && (
          <button 
            className={styles.clearButton}
            onClick={() => onSelect(null)}
          >
            {locale === 'ar' ? 'إلغاء التصفية' : 'Clear Filter'}
          </button>
        )}
      </div>
      
      <div className={styles.sliderWrapper}>
        <button
          className={`${styles.arrow} ${styles.arrowLeft}`}
          onClick={() => scroll('left')}
          aria-label={isRTL ? 'التمرير لليمين' : 'Scroll left'}
        >
          <ChevronLeft size={20} />
        </button>

        <div 
          className={styles.slider} 
          ref={sliderRef}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {VEHICLE_TYPES.map((vehicle) => {
            const isSelected = selectedType === vehicle.id;
            const label = locale === 'ar' ? vehicle.labelAR : vehicle.labelEN;
            
            return (
              <button
                key={vehicle.id}
                className={`${styles.vehicleCard} ${isSelected ? styles.selected : ''}`}
                onClick={() => handleSelect(vehicle.id)}
                aria-pressed={isSelected}
                title={label}
              >
                <div className={styles.iconWrapper}>
                  <Image
                    src={vehicle.iconPath}
                    alt={label}
                    width={60}
                    height={60}
                    className={styles.vehicleIcon}
                    loading="lazy"
                  />
                </div>
                <span className={styles.vehicleLabel}>{label}</span>
              </button>
            );
          })}
        </div>

        <button
          className={`${styles.arrow} ${styles.arrowRight}`}
          onClick={() => scroll('right')}
          aria-label={isRTL ? 'التمرير لليسار' : 'Scroll right'}
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </section>
  );
}
