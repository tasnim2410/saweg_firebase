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
  longitude: number,
  locale: 'ar' | 'en' = 'en'
): Promise<GeocodingResult> {
  try {
    // Request Arabic first when locale is Arabic, otherwise English
    const acceptLanguage = locale === 'ar' ? 'ar,en' : 'en,ar';
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Saweg-App/1.0',
          'Accept-Language': acceptLanguage,
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
  'Sirte': { ar: 'سرت', en: 'Sirte' },
  'Ajdabiya': { ar: 'أجدابيا', en: 'Ajdabiya' },
  // Additional Libyan cities
  'Marj': { ar: 'المرج', en: 'Marj' },
  'Al Marj': { ar: 'المرج', en: 'Al Marj' },
  'Tamina': { ar: 'تامينة', en: 'Tamina' },
  'Al Bayda': { ar: 'البيضاء', en: 'Al Bayda' },
  'Bayda': { ar: 'البيضاء', en: 'Bayda' },
  'Shahhat': { ar: 'شحات', en: 'Shahhat' },
  'Qasr Libya': { ar: 'قصر ليبيا', en: 'Qasr Libya' },
  'Al Abraq': { ar: 'الأبرق', en: 'Al Abraq' },
  'Jardas': { ar: 'جردس', en: 'Jardas' },
  'Susa': { ar: 'سوسة', en: 'Susa' },
  'Bomba': { ar: 'بومبا', en: 'Bomba' },
  'Ras Al Helal': { ar: 'رأس الهلال', en: 'Ras Al Helal' },
  'Tocra': { ar: 'توكرة', en: 'Tocra' },
  'Al Fawakhir': { ar: 'الفواخير', en: 'Al Fawakhir' },
  'Marawa': { ar: 'مراوة', en: 'Marawa' },
  'Al Urubah': { ar: 'العروبة', en: 'Al Urubah' },
  'Tulmaythah': { ar: 'طلميثة', en: 'Tulmaythah' },
  'Al Bayyadah': { ar: 'البياضة', en: 'Al Bayyadah' },
  'Qandulah': { ar: 'قندولة', en: 'Qandulah' },
  'Sidi As Sidr': { ar: 'سيدي السدر', en: 'Sidi As Sidr' },
  'Al Haniyah': { ar: 'الحنية', en: 'Al Haniyah' },
  'Al Qubbah': { ar: 'القبة', en: 'Al Qubbah' },
  'Miyar': { ar: 'ميار', en: 'Miyar' },
  'Al Awjilah': { ar: 'الأوجلة', en: 'Al Awjilah' },
  'Jalu': { ar: 'جالو', en: 'Jalu' },
  'Jikharrah': { ar: 'جخارة', en: 'Jikharrah' },
  'Massah': { ar: 'ماسة', en: 'Massah' },
  'Tacnis': { ar: 'تاكنس', en: 'Tacnis' },
  // Small towns and villages
  'Bir al Ghanam': { ar: 'بير الغنم', en: 'Bir al Ghanam' },
  'Al Ghurayfah': { ar: 'الغريفة', en: 'Al Ghurayfah' },
  'Al Hashan': { ar: 'الحشان', en: 'Al Hashan' },
  'Asbi ah': { ar: 'أسبيعة', en: 'Asbi ah' },
  'Aziziya': { ar: 'العزيزية', en: 'Aziziya' },
  'Bani Walid': { ar: 'بني وليد', en: 'Bani Walid' },
  'Bi r Tlegh': { ar: 'بير تليغ', en: 'Bi r Tlegh' },
  'Brak': { ar: 'براك', en: 'Brak' },
  'Bu Nujaym': { ar: 'بونجيم', en: 'Bu Nujaym' },
  'Dafinah': { ar: 'دافنة', en: 'Dafinah' },
  'Deriana': { ar: 'دريانة', en: 'Deriana' },
  'El Bayyada': { ar: 'البريقة', en: 'El Bayyada' },
  'El Beida': { ar: 'البيضاء', en: 'El Beida' },
  'El Agheila': { ar: 'العقيلة', en: 'El Agheila' },
  'El Mari': { ar: 'المرية', en: 'El Mari' },
  'El Tag': { ar: 'التاج', en: 'El Tag' },
  'Ghadames': { ar: 'غدامس', en: 'Ghadames' },
  'Gialo': { ar: 'جالو', en: 'Gialo' },
  'Hun': { ar: 'هون', en: 'Hun' },
  'Jadid': { ar: 'جديد', en: 'Jadid' },
  'Kabaw': { ar: 'كاباو', en: 'Kabaw' },
  'Kikla': { ar: 'ككلة', en: 'Kikla' },
  'Maradah': { ar: 'مرادة', en: 'Maradah' },
  'Mizdah': { ar: 'مزدة', en: 'Mizdah' },
  'Msallata': { ar: 'مسلاتة', en: 'Msallata' },
  'Nofaliya': { ar: 'نوفلية', en: 'Nofaliya' },
  'Qaryat': { ar: 'قرية', en: 'Qaryat' },
  'Qayqab': { ar: 'قيقب', en: 'Qayqab' },
  'Qurayyat': { ar: 'قريات', en: 'Qurayyat' },
  'Rigdale': { ar: 'رقدال', en: 'Rigdale' },
  'Sabhah': { ar: 'سبها', en: 'Sabhah' },
  'Sidi Khalifah': { ar: 'سيدي خليفة', en: 'Sidi Khalifah' },
  'Sidi Khalifa': { ar: 'سيدي خليفة', en: 'Sidi Khalifa' },
  'Sorman': { ar: 'صرمان', en: 'Sorman' },
  'Tajoura': { ar: 'تاجوراء', en: 'Tajoura' },
  'Tarhunah': { ar: 'ترهونة', en: 'Tarhunah' },
  'Tawergha': { ar: 'تورغاء', en: 'Tawergha' },
  'Tazirbu': { ar: 'تازربو', en: 'Tazirbu' },
  'Tiji': { ar: 'تيجي', en: 'Tiji' },
  'Umm al Rizam': { ar: 'أم الريزم', en: 'Umm al Rizam' },
  'Waddan': { ar: 'ودان', en: 'Waddan' },
  'Wazzin': { ar: 'وزان', en: 'Wazzin' },
  'Yafran': { ar: 'يفرن', en: 'Yafran' },
  'Zaltan': { ar: 'زلطن', en: 'Zaltan' },
  'Zlitan': { ar: 'زليتن', en: 'Zlitan' },
  'Zuwara': { ar: 'زوارة', en: 'Zuwara' },
  'Zwara': { ar: 'زوارة', en: 'Zwara' },
  'Al Jawf': { ar: 'الجوف', en: 'Al Jawf' },
  'Al Kufrah': { ar: 'الكفرة', en: 'Al Kufrah' },
  'Al Uqaylah': { ar: 'العقيلة', en: 'Al Uqaylah' },
  'Ash Shati': { ar: 'الشاطئ', en: 'Ash Shati' },
  'Brega': { ar: 'البريقة', en: 'Brega' },
  'Gubba': { ar: 'قبة', en: 'Gubba' },
  'Jufra': { ar: 'الجفرة', en: 'Jufra' },
  'Kufra': { ar: 'الكفرة', en: 'Kufra' },
  'Murzuk': { ar: 'مرزق', en: 'Murzuk' },
  'Tazirbo': { ar: 'تازربو', en: 'Tazirbo' },
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
  'Al Agheila': { ar: 'العقيلة', en: 'Al Agheila' },
  'Al Abyar': { ar: 'الأبيار', en: 'Al Abyar' },
  'Al Fatiah': { ar: 'الفتية', en: 'Al Fatiah' },
  'Al Jaghbub': { ar: 'الجغبوب', en: 'Al Jaghbub' },
  'Al Jifarah': { ar: 'الجفارة', en: 'Al Jifarah' },
  'Al Quseir': { ar: 'القصير', en: 'Al Quseir' },
  'Al Wadi al Kabir': { ar: 'الوادي الكبير', en: 'Al Wadi al Kabir' },
  'Al Jabal al Akhdar': { ar: 'الجبل الأخضر', en: 'Al Jabal al Akhdar' },
  'Al Lathrun': { ar: 'اللثورن', en: 'Al Lathrun' },
  'Al Qarah': { ar: 'القارة', en: 'Al Qarah' },
  'Al Uqayla': { ar: 'العقيلة', en: 'Al Uqayla' },
  'Amsar': { ar: 'أمزر', en: 'Amsar' },
  'Appolonia': { ar: 'سوسة', en: 'Apollonia' },  // Archaeological, often in OSM
  'Bardia': { ar: 'بردية', en: 'Bardia' },
  'Darnah': { ar: 'درنة', en: 'Darnah' },  // OSM variant of Derna
  'Labraq': { ar: 'الأبرق', en: 'Labraq' }, 
'Misratah': { ar: 'مصراتة', en: 'Misratah' },  // OSM standard
'Hawat al Bilad': { ar: 'هوات البلاد', en: 'Hawat al Bilad' },
'Msallatah': { ar: 'مسلاتة', en: 'Msallatah' },
'Nofaliyah': { ar: 'نوفلية', en: 'Nofaliyah' },
'Raas al Helal': { ar: 'رأس الهلال', en: 'Raas al Helal' },
'Samarli': { ar: 'سمارلي', en: 'Samarli' },
'Sumar': { ar: 'سمّار', en: 'Sumar' },
'Zalatan': { ar: 'زلطن', en: 'Zalatan' },
'Al Aziziyah': { ar: 'العزيزية', en: 'Al Aziziyah' },
'Al Khums': { ar: 'الخمس', en: 'Al Khums' },
'Bir Gandula': { ar: 'بئر الغانم', en: 'Bir Gandula' },  // Variant
'Gharyan': { ar: 'غريان', en: 'Gharyan' },
'Msellata': { ar: 'مسلطة', en: 'Msellata' },  // Variant
'Surman': { ar: 'صرمان', en: 'Surman' },
'Tajura': { ar: 'تاجوراء', en: 'Tajura' },
'Zawiyat al Baida': { ar: 'زاوية البيضاء', en: 'Zawiyat al Baida' },
'Al Shati': { ar: 'الفحيحة', en: 'Al Shati' },
'Gadames': { ar: 'غدامس', en: 'Gadames' },
'Jawf': { ar: 'الجوف', en: 'Jawf' },  // Variant
'Murzuq': { ar: 'مرزوق', en: 'Murzuq' },
'Sabha': { ar: 'سبها', en: 'Sabha' },
'Sabkhat Tawurgha': { ar: 'سبخة تورغاء', en: 'Sabkhat Tawurgha' },
'Tazerbo': { ar: 'تازربو', en: 'Tazerbo' },
'Zala': { ar: 'زلة', en: 'Zala' },


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
  const geocodingResult = await reverseGeocode(latitude, longitude, 'ar');
  
  if (!geocodingResult.fullAddress) {
    return null;
  }
  
  // Parse the full address to get components
  // Nominatim returns: "road, suburb, neighbourhood, city/town/village, county, state, country, postcode"
  const parts = geocodingResult.fullAddress.split(',').map(p => p.trim()).filter(Boolean);
  
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
  
  // Find the main city/town (prefer geocodingResult.city if available, otherwise search in parts)
  let cityOrTown = geocodingResult.city || '';
  
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
  
  return components.length > 0 ? components.join(', ') : translateLocationName(geocodingResult.city || geocodingResult.address || geocodingResult.fullAddress, locale);
}
