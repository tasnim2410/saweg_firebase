// Shared vehicle type configuration
// Use short IDs as values for storage/API, separate display labels for each locale

export const VEHICLE_TYPE_CONFIG = [
  { id: 'van-box', labelAR: 'شاحنة صندوقية', labelEN: 'Van / Box Truck', imagePath: '/images/van_box_truck.png' },
  { id: 'flatbed', labelAR: 'شاحنة مسطحة', labelEN: 'Flatbed Truck', imagePath: '/images/flatbed_truck.png' },
  { id: 'reefer', labelAR: 'شاحنة مبردة', labelEN: 'Reefer Truck', imagePath: '/images/reefer_truck.png' },
  { id: 'dump', labelAR: 'شاحنة قلابة', labelEN: 'Dump Truck / Tipper', imagePath: '/images/dump_truck_tipper.png' },
  { id: 'curtainsider', labelAR: 'شاحنة مغطاة', labelEN: 'Curtainsider', imagePath: '/images/curtainsider.png' },
  { id: 'tanker', labelAR: 'شاحنة صهريج', labelEN: 'Tanker Truck', imagePath: '/images/tanker_truck.png' },
  { id: 'tail-lift', labelAR: 'شاحنة برافعة خلفية', labelEN: 'Tail-lift Truck', imagePath: '/images/tail_lift_truck.png' },
  { id: 'crane', labelAR: 'شاحنة رافعة', labelEN: 'Crane Truck', imagePath: '/images/crane_truck.png' },
  { id: 'drop-side', labelAR: 'شاحنة صندوقية بجوانب قابلة للطي', labelEN: 'Drop-side Truck', imagePath: '/images/drop_side_truck.png' },
  { id: 'container', labelAR: 'شاحنة حاويات/شاسيه حامل حاويات', labelEN: 'Container Truck', imagePath: '/images/container_truck.png' },
  { id: 'food-grade', labelAR: 'شاحنة صهريج أغذية', labelEN: 'Food Grade Tanker', imagePath: '/images/food_grade_tranker.png' },
  { id: 'semi-trailer', labelAR: 'نصف مقطورة مجرورة', labelEN: 'Semi Trailer', imagePath: '/images/semi_trailer.png' },
  { id: 'other', labelAR: 'أخرى', labelEN: 'Other', imagePath: '/images/other_truck_icon.png' },
] as const;

export type VehicleTypeId = typeof VEHICLE_TYPE_CONFIG[number]['id'];

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

// Helper to get image path
export function getVehicleImagePath(id: VehicleTypeId): string {
  const config = VEHICLE_TYPE_CONFIG.find(v => v.id === id);
  return config?.imagePath ?? '';
}

// All valid vehicle type IDs for validation
export const VALID_VEHICLE_TYPE_IDS = new Set(VEHICLE_TYPE_CONFIG.map(v => v.id));

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
