import * as Location from 'expo-location';

export interface PhotoLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

/** Request location permission and return current position, or null on failure/denial/timeout. */
export async function getCurrentLocation(): Promise<PhotoLocation | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const location = await Promise.race<Location.LocationObject | null>([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 5000)),
    ]);

    if (!location) return null;

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy ?? null,
      timestamp: location.timestamp,
    };
  } catch {
    return null;
  }
}

/** Haversine distance in metres between two lat/lon points. */
export function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Reverse-geocode a coordinate to a human-readable address string. */
export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const result = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    if (result[0]) {
      const r = result[0];
      return [r.street, r.city, r.region].filter(Boolean).join(', ');
    }
  } catch {}
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}
