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

/**
 * Get a short location name (city or place name) from coordinates
 * Used for displaying in UI
 */
export async function getLocationName(
  latitude: number,
  longitude: number
): Promise<string | null> {
  const result = await reverseGeocode(latitude, longitude);
  return result.city || result.address || result.fullAddress;
}
