/**
 * Geolocation utility functions
 */

export interface LocationData {
  postal_code?: string;
  street?: string;
  city?: string;
  country?: string;
}

/**
 * Get current location using browser's Geolocation API
 */
export const getCurrentLocation = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });
  });
};

/**
 * Reverse geocode coordinates to get address information using Nominatim (OpenStreetMap)
 * This is a free service, no API key required
 */
export const reverseGeocode = async (latitude: number, longitude: number): Promise<LocationData> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'RKS-Chatbot-App'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to reverse geocode');
    }

    const data = await response.json();
    
    // Extract address components
    const address = data.address || {};
    
    // Build street address (street + house number)
    let street = '';
    if (address.road) {
      street = address.road;
      if (address.house_number) {
        street += ' ' + address.house_number;
      }
    }
    
    return {
      postal_code: address.postcode || undefined,
      street: street || undefined,
      city: address.city || address.town || address.village || undefined,
      country: address.country || undefined
    };
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    // Return empty location data if geocoding fails
    return {};
  }
};

/**
 * Get current location with address information
 */
export const getLocationWithAddress = async (): Promise<LocationData> => {
  const position = await getCurrentLocation();
  const { latitude, longitude } = position.coords;
  
  return await reverseGeocode(latitude, longitude);
};

/**
 * Format location for display
 */
export const formatLocation = (note: { 
  location_postal_code?: string | null;
  location_street?: string | null;
  location_city?: string | null; 
  location_country?: string | null;
}): string | null => {
  const parts: string[] = [];
  
  if (note.location_street) {
    parts.push(note.location_street);
  }
  
  if (note.location_postal_code && note.location_city) {
    parts.push(`${note.location_postal_code} ${note.location_city}`);
  } else if (note.location_city) {
    parts.push(note.location_city);
  }
  
  if (note.location_country) {
    parts.push(note.location_country);
  }
  
  return parts.length > 0 ? parts.join(', ') : null;
};
