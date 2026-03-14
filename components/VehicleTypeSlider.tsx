'use client';

import React, { useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Image, { StaticImageData } from 'next/image';
import styles from './VehicleTypeSlider.module.css';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import vanIcon from '@/public/images/van_icon.svg';
import flatbedIcon from '@/public/images/flatbet_truck_icon.svg';
import reeferIcon from '@/public/images/reefer_truck_icon.svg';
import dumpIcon from '@/public/images/dump_truck_icon.svg';
import curtainsiderIcon from '@/public/images/curtainsider_icon.svg';
import tankerIcon from '@/public/images/tanker_truck_icon.svg';
import tailLiftIcon from '@/public/images/tail_lift_truck_icon.svg';
import craneIcon from '@/public/images/crane_truck_icon.svg';
import dropSideIcon from '@/public/images/drop_side_truck_icon.svg';
import containerIcon from '@/public/images/container_truck_icon.svg';
import semiTrailerIcon from '@/public/images/semi_trailer_icon.svg';
import towingIcon from '@/public/images/towing_truck_icon.svg';
import otherIcon from '@/public/images/other_icon.svg';

interface VehicleType {
  id: string;
  labelAR: string;
  labelEN: string;
  iconPath: StaticImageData;
}

const VEHICLE_TYPES: VehicleType[] = [
  { id: 'van-box', labelAR: 'صندوقية', labelEN: 'Van/Box', iconPath: vanIcon },
  { id: 'flatbed', labelAR: 'مسطحة', labelEN: 'Flatbed', iconPath: flatbedIcon },
  { id: 'reefer', labelAR: 'براد', labelEN: 'Reefer', iconPath: reeferIcon },
  { id: 'dump', labelAR: 'قلابة', labelEN: 'Dump', iconPath: dumpIcon },
  { id: 'curtainsider', labelAR: 'ستارة', labelEN: 'Curtainsider', iconPath: curtainsiderIcon },
  { id: 'tanker', labelAR: 'صهريج', labelEN: 'Tanker', iconPath: tankerIcon },
  { id: 'tail-lift', labelAR: 'برافعة خلفية', labelEN: 'Tail-lift', iconPath: tailLiftIcon },
  { id: 'crane', labelAR: 'رافعة', labelEN: 'Crane', iconPath: craneIcon },
  { id: 'drop-side', labelAR: 'بجوانب قابلة لطي', labelEN: 'Drop-side', iconPath: dropSideIcon },
  { id: 'container', labelAR: 'شاحنة حاويات', labelEN: 'Container', iconPath: containerIcon },
  { id: 'semi-trailer', labelAR: 'مجرورة', labelEN: 'Semi Trailer', iconPath: semiTrailerIcon },
  { id: 'towing', labelAR: 'سحب', labelEN: 'Towing', iconPath: towingIcon },
  { id: 'other', labelAR: 'أخرى', labelEN: 'Other', iconPath: otherIcon },
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
      onSelect(null);
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
