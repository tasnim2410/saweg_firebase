// Shared vehicle type configuration
// Use short IDs as values for storage/API, separate display labels for each locale

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
import foodGradeTankerIcon from '@/public/images/food_grade_tanker.svg';
import semiTrailerIcon from '@/public/images/semi_trailer_icon.svg';
import towingIcon from '@/public/images/towing_truck_icon.svg';
import otherIcon from '@/public/images/other_icon.svg';
import type { StaticImageData } from 'next/image';

export type VehicleTypeId =
  | 'van-box' | 'flatbed' | 'reefer' | 'dump' | 'curtainsider'
  | 'tanker' | 'tail-lift' | 'crane' | 'drop-side' | 'container'
  | 'food-grade' | 'semi-trailer' | 'towing' | 'other';

interface VehicleTypeConfigItem {
  id: VehicleTypeId;
  labelAR: string;
  labelEN: string;
  image: StaticImageData;
}

export const VEHICLE_TYPE_CONFIG: VehicleTypeConfigItem[] = [
  { id: 'van-box', labelAR: 'شاحنة صندوقية', labelEN: 'Van / Box Truck', image: vanIcon },
  { id: 'flatbed', labelAR: 'شاحنة مسطحة', labelEN: 'Flatbed Truck', image: flatbedIcon },
  { id: 'reefer', labelAR: 'شاحنة مبردة', labelEN: 'Reefer Truck', image: reeferIcon },
  { id: 'dump', labelAR: 'شاحنة قلابة', labelEN: 'Dump Truck / Tipper', image: dumpIcon },
  { id: 'curtainsider', labelAR: 'شاحنة مغطاة', labelEN: 'Curtainsider', image: curtainsiderIcon },
  { id: 'tanker', labelAR: 'شاحنة صهريج', labelEN: 'Tanker Truck', image: tankerIcon },
  { id: 'tail-lift', labelAR: 'شاحنة برافعة خلفية', labelEN: 'Tail-lift Truck', image: tailLiftIcon },
  { id: 'crane', labelAR: 'شاحنة رافعة', labelEN: 'Crane Truck', image: craneIcon },
  { id: 'drop-side', labelAR: 'شاحنة صندوقية بجوانب قابلة للطي', labelEN: 'Drop-side Truck', image: dropSideIcon },
  { id: 'container', labelAR: 'شاحنة حاويات/شاسيه حامل حاويات', labelEN: 'Container Truck', image: containerIcon },
  { id: 'food-grade', labelAR: 'شاحنة صهريج أغذية', labelEN: 'Food Grade Tanker', image: foodGradeTankerIcon },
  { id: 'semi-trailer', labelAR: 'نصف مقطورة مجرورة', labelEN: 'Semi Trailer', image: semiTrailerIcon },
  { id: 'towing', labelAR: 'شاحنة سحب', labelEN: 'Towing Truck', image: towingIcon },
  { id: 'other', labelAR: 'أخرى', labelEN: 'Other', image: otherIcon },
];

// For backward compatibility with existing data - map old combined labels to new IDs
export const LEGACY_VEHICLE_TYPE_MAP: Record<string, VehicleTypeId> = {
  'شاحنة صندوقية (Van / Box Truck)': 'van-box',
  'شاحنة مسطحة (Flatbed Truck)': 'flatbed',
  'شاحنة مبردة (Reefer Truck)': 'reefer',
  'شاحنة قلابة (Dump Truck / Tipper)': 'dump',
  'شاحنة مغطاة (Curtainsider)': 'curtainsider',
  'شاحنة صهريج (Tanker Truck)': 'tanker',
  'شاحنة برافعة خلفية (Tail-lift Truck)': 'tail-lift',
  'شاحنة رافعة (Crane Truck)': 'crane',
  'شاحنة صندوقية بجوانب قابلة للطي (Drop-side Truck)': 'drop-side',
  'شاحنة حاويات/شاسيه حامل حاويات (Container Truck)': 'container',
  'شاحنة صهريج أغذية (Food Grade Tanker)': 'food-grade',
  'نصف مقطورة مجرورة(semi Trailer)': 'semi-trailer',
  'نصف مقطورة مجرورة (semi Trailer)': 'semi-trailer',
};

// Helper to get label based on locale
export function getVehicleLabel(id: VehicleTypeId, locale: 'ar' | 'en'): string {
  const config = VEHICLE_TYPE_CONFIG.find(v => v.id === id);
  if (!config) return id;
  return locale === 'ar' ? config.labelAR : config.labelEN;
}

// Helper to get image
export function getVehicleImage(id: VehicleTypeId): StaticImageData | null {
  const config = VEHICLE_TYPE_CONFIG.find(v => v.id === id);
  return config?.image ?? null;
}

// All valid vehicle type IDs for validation
export const VALID_VEHICLE_TYPE_IDS = new Set<VehicleTypeId>(VEHICLE_TYPE_CONFIG.map(v => v.id));

// Check if a value is a valid vehicle type (supports both new IDs and legacy labels)
export function isValidVehicleType(value: string): value is VehicleTypeId {
  if (VALID_VEHICLE_TYPE_IDS.has(value as VehicleTypeId)) return true;
  if (LEGACY_VEHICLE_TYPE_MAP[value]) return true;
  return false;
}

// Normalize any vehicle type value to the new ID format
export function normalizeVehicleType(value: string): VehicleTypeId | null {
  if (VALID_VEHICLE_TYPE_IDS.has(value as VehicleTypeId)) return value as VehicleTypeId;
  return LEGACY_VEHICLE_TYPE_MAP[value] ?? null;
}
