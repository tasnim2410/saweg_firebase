import { LOCATION_OPTIONS } from './locations';

interface Coordinates {
  lat: number;
  lon: number;
}

interface CityCache {
  [cityName: string]: Coordinates;
}

// In-memory cache for city coordinates
const cityCache: CityCache = {
  // Pre-populated coordinates for major Libyan cities (to reduce API calls)
  'Tripoli (Capital of Libya)': { lat: 32.8872, lon: 13.1913 },
  'Tripoli': { lat: 32.8872, lon: 13.1913 },
  'Benghazi': { lat: 32.1167, lon: 20.0667 },
  'Misurata': { lat: 32.3753, lon: 15.0925 },
  'Sirte': { lat: 31.2044, lon: 16.5887 },
  'Sebha': { lat: 27.0377, lon: 14.4283 },
  'Ajdabiya': { lat: 30.7554, lon: 20.2263 },
  'Zawiya': { lat: 32.7522, lon: 12.7278 },
  'Derna': { lat: 32.7648, lon: 22.6391 },
  'Tobruk': { lat: 32.0836, lon: 23.9764 },
  'Bayda': { lat: 32.7627, lon: 21.7556 },
  'Zliten': { lat: 32.4674, lon: 14.5687 },
  'Al Khums': { lat: 32.6486, lon: 14.2619 },
  'Gharyan': { lat: 32.1722, lon: 13.0203 },
  'Marj': { lat: 32.4927, lon: 20.8305 },
  'Ghat': { lat: 24.9647, lon: 10.1808 },
  'Kufra': { lat: 24.1833, lon: 23.2833 },
  // Tunisian cities
  'Tunis': { lat: 36.8065, lon: 10.1815 },
  'Sfax': { lat: 34.7398, lon: 10.7600 },
  'Sousse': { lat: 35.8256, lon: 10.6411 },
  // Egyptian cities
  'Cairo': { lat: 30.0444, lon: 31.2357 },
  'Alexandria': { lat: 31.2001, lon: 29.9187 },
  'Giza': { lat: 30.0131, lon: 31.2089 },
};

/**
 * Geocode a city name to get its coordinates using OpenStreetMap Nominatim API
 * Uses country hints based on the city name to improve accuracy
 */
export async function geocodeCity(cityName: string): Promise<Coordinates | null> {
  // Check cache first
  if (cityCache[cityName]) {
    return cityCache[cityName];
  }

  // Determine country hint based on city name patterns
  const normalizedCity = cityName.toLowerCase();
  let countryHint = '';
  
  // Tunisian cities
  const tunisianCities = ['tunis', 'sfax', 'sousse', 'kairouan', 'bizerte', 'gabès', 'ariana', 'gafsa'];
  // Egyptian cities
  const egyptianCities = ['cairo', 'alexandria', 'giza', 'shubra', 'port said', 'suez', 'luxor', 'aswan'];
  // Libyan cities (default)
  const libyanCities = ['tripoli', 'benghazi', 'misurata', 'sirte', 'sebha', 'ajdabiya', 'zawiya', 'derna', 'tobruk'];
  
  if (tunisianCities.some(c => normalizedCity.includes(c))) {
    countryHint = ', Tunisia';
  } else if (egyptianCities.some(c => normalizedCity.includes(c))) {
    countryHint = ', Egypt';
  } else if (libyanCities.some(c => normalizedCity.includes(c))) {
    countryHint = ', Libya';
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName + countryHint)}&limit=1`,
      {
        headers: {
          'User-Agent': 'SawegApp/1.0',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const coords = {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };
      // Cache the result
      cityCache[cityName] = coords;
      return coords;
    }
  } catch {
    // Fail silently - we'll use approximate distances or fallback
  }

  return null;
}

/**
 * Calculate distance between two coordinates using the Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLon = toRadians(coord2.lon - coord1.lon);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.lat)) *
      Math.cos(toRadians(coord2.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get coordinates for a location string (city name)
 * Tries exact match first, then falls back to geocoding
 */
export async function getLocationCoordinates(location: string): Promise<Coordinates | null> {
  if (!location) return null;

  const normalizedLocation = location.trim();

  // Try exact match from LOCATION_OPTIONS
  const locationOption = LOCATION_OPTIONS.find(
    (opt) =>
      opt.value.toLowerCase() === normalizedLocation.toLowerCase() ||
      opt.en.toLowerCase() === normalizedLocation.toLowerCase() ||
      opt.ar === normalizedLocation
  );

  if (locationOption) {
    // Check if we have cached coordinates
    if (cityCache[locationOption.value]) {
      return cityCache[locationOption.value];
    }

    // Try to geocode using the English name for better accuracy
    const coords = await geocodeCity(locationOption.en);
    if (coords) {
      cityCache[locationOption.value] = coords;
      return coords;
    }
  }

  // Fallback: try to geocode the raw location string
  return await geocodeCity(normalizedLocation);
}

/**
 * Check if a provider is within the specified distance from a reference point
 */
export async function isWithinDistance(
  providerLocation: string,
  referenceCoords: Coordinates,
  maxDistanceKm: number
): Promise<boolean> {
  const providerCoords = await getLocationCoordinates(providerLocation);

  if (!providerCoords) {
    // If we can't geocode the provider location, assume it's not within distance
    // unless it's the same city name
    return false;
  }

  const distance = calculateDistance(referenceCoords, providerCoords);
  return distance <= maxDistanceKm;
}

/**
 * Get user's current location using browser geolocation API with timeout
 */
export function getCurrentPosition(timeoutMs = 15000): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    const timeoutId = setTimeout(() => {
      reject(new Error('Location request timed out'));
    }, timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        resolve(position);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 60000,
      }
    );
  });
}

/**
 * Find the nearest city from LOCATION_OPTIONS given coordinates
 * Returns the city value (key) that is closest to the given coordinates
 */
export async function findNearestCity(
  coords: Coordinates,
  options: { value: string; en: string; ar: string }[] = LOCATION_OPTIONS
): Promise<string | null> {
  let nearestCity: string | null = null;
  let minDistance = Infinity;

  // Filter out non-city options (like "All of Libya")
  const cityOptions = options.filter(
    (opt) => !opt.value.startsWith('ALL_')
  );

  for (const city of cityOptions) {
    const cityCoords = await getLocationCoordinates(city.value);
    if (cityCoords) {
      const distance = calculateDistance(coords, cityCoords);
      if (distance < minDistance) {
        minDistance = distance;
        nearestCity = city.value;
      }
    }
  }

  return nearestCity;
}

/**
 * Get approximate distance range for city matching (when exact geocoding fails)
 * Returns a rough estimate based on known nearby city relationships
 */
export function getNearbyCities(cityName: string): string[] {
  const nearbyMap: { [key: string]: string[] } = {
    'Tripoli (Capital of Libya)': ['Zawiya', 'Al Maya', 'Gharyan', 'Tajura', 'Janzur'],
    'Benghazi': ['Abyar', 'Suluq', 'Qaminis', 'Tocra', 'Ajdabiya'],
    'Misurata': ['Zliten', 'Al Khums', 'Bani Walid'],
    'Sirte': ['Brega', 'Gulf of Sidra', 'Zamzam', 'Hun'],
    'Sebha': ['Murzuk', 'Ubari', 'Traghan', 'Wadi Utba'],
    'Derna': ['Al Qubah', 'Cyrene', 'Umm al Rizam'],
    'Tobruk': ['Musaid', 'Jaghbub'],
    'Ajdabiya': ['Brega', 'Jalu', 'Marada'],
  };

  return nearbyMap[cityName] || [];
}
