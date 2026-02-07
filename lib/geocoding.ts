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
 * Get formatted location with city/town, state/county, and country
 * Returns a general location string like "City, State, Country" or "Town, Country"
 */
export async function getFormattedLocationName(
  latitude: number,
  longitude: number
): Promise<string | null> {
  const result = await reverseGeocode(latitude, longitude);
  
  if (!result.fullAddress) {
    return null;
  }
  
  // Parse the full address to get components
  // Nominatim returns: "road, suburb, neighbourhood, city/town/village, county, state, country"
  const parts = result.fullAddress.split(',').map(p => p.trim()).filter(Boolean);
  
  // Find country (usually last)
  const country = parts[parts.length - 1] || '';
  
  // Find state/county (usually second to last or third to last)
  const stateOrCounty = parts[parts.length - 2] || parts[parts.length - 3] || '';
  
  // Find city/town (look for common patterns, usually before state/county)
  let cityOrTown = '';
  for (let i = parts.length - 3; i >= 0; i--) {
    const part = parts[i];
    // Skip road names (usually contain numbers or are long)
    if (part.length > 3 && !/^\d/.test(part)) {
      cityOrTown = part;
      break;
    }
  }
  
  // Build the formatted location
  const components: string[] = [];
  
  if (cityOrTown) {
    components.push(cityOrTown);
  }
  
  // Add state/county if different from city and exists
  if (stateOrCounty && stateOrCounty !== cityOrTown) {
    components.push(stateOrCounty);
  }
  
  // Always add country if available
  if (country) {
    components.push(country);
  }
  
  return components.length > 0 ? components.join(', ') : result.city || result.address || result.fullAddress;
}
