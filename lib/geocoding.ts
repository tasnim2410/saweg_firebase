/**
 * Reverse geocoding utility using OpenStreetMap Nominatim API
 * Converts latitude/longitude to a human-readable address/city name
 */

interface NominatimResponse {
  display_name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
    suburb?: string;
    neighbourhood?: string;
    road?: string;
    house_number?: string;
  };
}

interface GeocodingResult {
  address: string | null;
  city: string | null;
  fullAddress: string | null;
}

/**
 * Reverse geocode coordinates to get address
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 * Rate limit: 1 request per second
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodingResult> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Saweg-App/1.0',
          'Accept-Language': 'en,ar',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }

    const data: NominatimResponse = await response.json();

    if (!data.address) {
      return { address: null, city: null, fullAddress: null };
    }

    // Extract city name (could be city, town, or village)
    const city =
      data.address.city ||
      data.address.town ||
      data.address.village ||
      data.address.county ||
      null;

    // Build a concise address (City, Country or just City)
    const country = data.address.country || '';
    const address = city ? (country ? `${city}, ${country}` : city) : null;

    // Full address for detailed display
    const fullAddress = data.display_name || null;

    return {
      address: address || fullAddress,
      city,
      fullAddress,
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return { address: null, city: null, fullAddress: null };
  }
}

// Arabic translations for common location names
const LOCATION_TRANSLATIONS: Record<string, { ar: string; en: string }> = {
  'Libya': { ar: 'ليبيا', en: 'Libya' },
  'Tunisia': { ar: 'تونس', en: 'Tunisia' },
  'Egypt': { ar: 'مصر', en: 'Egypt' },
  'Tripoli': { ar: 'طرابلس', en: 'Tripoli' },
  'Benghazi': { ar: 'بنغازي', en: 'Benghazi' },
  'Misrata': { ar: 'مصراتة', en: 'Misrata' },
  'Tarhuna': { ar: 'تاجوراء', en: 'Tarhuna' },
  'Murqub': { ar: 'المرقب', en: 'Murqub' },
  'Derna': { ar: 'درنة', en: 'Derna' },
  'Tobruk': { ar: 'طبرق', en: 'Tobruk' },
  'Ghat': { ar: 'غات', en: 'Ghat' },
  'Ubari': { ar: 'أوباري', en: 'Ubari' },
  'Sebha': { ar: 'سبها', en: 'Sebha' },
  'Nalut': { ar: 'نالوت', en: 'Nalut' },
  'Zintan': { ar: 'الزنتان', en: 'Zintan' },
  'Zawiya': { ar: 'الزاوية', en: 'Zawiya' },
  'Sabratha': { ar: 'صبراتة', en: 'Sabratha' },
  'Khoms': { ar: 'الخمس', en: 'Khoms' },
  'Surt': { ar: 'سرت', en: 'Surt' },
  'Ajdabiya': { ar: 'أجدابيا', en: 'Ajdabiya' },
  'Tunis': { ar: 'تونس', en: 'Tunis' },
  'Ariana': { ar: 'أريانة', en: 'Ariana' },
  'Ben Arous': { ar: 'بن عروس', en: 'Ben Arous' },
  'Manouba': { ar: 'منوبة', en: 'Manouba' },
  'Sfax': { ar: 'صفاقس', en: 'Sfax' },
  'Sousse': { ar: 'سوسة', en: 'Sousse' },
  'Kairouan': { ar: 'القيروان', en: 'Kairouan' },
  'Gafsa': { ar: 'قفصة', en: 'Gafsa' },
  'Tozeur': { ar: 'توزر', en: 'Tozeur' },
  'Douz': { ar: 'دوز', en: 'Douz' },
  'Tataouine': { ar: 'تطاوين', en: 'Tataouine' },
  'Medenine': { ar: 'مدنين', en: 'Medenine' },
  'Djerba': { ar: 'جربة', en: 'Djerba' },
  'Bizerte': { ar: 'بنزرت', en: 'Bizerte' },
  'Nabeul': { ar: 'نابل', en: 'Nabeul' },
  'Hammamet': { ar: 'الحمامات', en: 'Hammamet' },
  'Monastir': { ar: 'المنستير', en: 'Monastir' },
  'Mahdia': { ar: 'المهدية', en: 'Mahdia' },
  'Cairo': { ar: 'القاهرة', en: 'Cairo' },
  'Alexandria': { ar: 'الإسكندرية', en: 'Alexandria' },
  'Giza': { ar: 'الجيزة', en: 'Giza' },
  'Aswan': { ar: 'أسوان', en: 'Aswan' },
  'Luxor': { ar: 'الأقصر', en: 'Luxor' },
  'Mansoura': { ar: 'المنصورة', en: 'Mansoura' },
  'Tanta': { ar: 'طنطا', en: 'Tanta' },
  'Zagazig': { ar: 'الزقازيق', en: 'Zagazig' },
  'Ismailia': { ar: 'الإسماعيلية', en: 'Ismailia' },
  'Port Said': { ar: 'بورسعيد', en: 'Port Said' },
  'Suez': { ar: 'السويس', en: 'Suez' },
};

/**
 * Check if a string contains Arabic characters
 */
function isArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

/**
 * Translate a location name to the specified language
 */
function translateLocationName(name: string, locale: 'ar' | 'en'): string {
  if (!name) return name;
  
  // Check exact match first
  const translation = LOCATION_TRANSLATIONS[name];
  if (translation) {
    return translation[locale];
  }
  
  // Check case-insensitive match
  for (const [key, value] of Object.entries(LOCATION_TRANSLATIONS)) {
    if (key.toLowerCase() === name.toLowerCase()) {
      return value[locale];
    }
  }
  
  // Return original if no translation found
  return name;
}

/**
 * Get formatted location with city/town, state/county, and country
 * Returns a general location string like "City, Country"
 * Supports Arabic translation when locale is 'ar'
 */
export async function getFormattedLocationName(
  latitude: number,
  longitude: number,
  locale: 'ar' | 'en' = 'en'
): Promise<string | null> {
  const result = await reverseGeocode(latitude, longitude);
  
  if (!result.fullAddress) {
    return null;
  }
  
  // Parse the full address to get components
  // Nominatim returns: "road, suburb, neighbourhood, city/town/village, county, state, country, postcode"
  const parts = result.fullAddress.split(',').map(p => p.trim()).filter(Boolean);
  
  // Find country (usually last)
  const country = parts[parts.length - 1] || '';
  
  // Filter out postal codes (numeric-only parts) and Arabic administrative divisions
  const nonNumericParts = parts.filter(p => {
    // Skip numeric-only parts
    if (/^\d+$/.test(p.trim())) return false;
    // Skip Arabic administrative divisions (معتمدية, ولاية, etc.)
    if (isArabic(p) && (p.includes('معتمدية') || p.includes('ولاية') || p.includes('محافظة'))) return false;
    return true;
  });
  
  // Find the main city/town (prefer result.city if available, otherwise search in parts)
  let cityOrTown = result.city || '';
  
  // If no city found in result, look for the most relevant part
  if (!cityOrTown && nonNumericParts.length > 0) {
    // Skip the last part (country) and find a good city candidate
    for (let i = nonNumericParts.length - 2; i >= 0; i--) {
      const part = nonNumericParts[i];
      // Skip very short parts and road names
      if (part.length > 2 && !/^\d/.test(part)) {
        cityOrTown = part;
        break;
      }
    }
  }
  
  // Build the formatted location with translations
  const components: string[] = [];
  
  if (cityOrTown) {
    components.push(translateLocationName(cityOrTown, locale));
  }
  
  // Always add country if available and different from city
  if (country && country !== cityOrTown) {
    components.push(translateLocationName(country, locale));
  }
  
  return components.length > 0 ? components.join(', ') : translateLocationName(result.city || result.address || result.fullAddress, locale);
}
