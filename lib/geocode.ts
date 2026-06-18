// Canonical geocoder — the single owner for turning an address string into
// map coordinates (forward) and coordinates back into an address (reverse).
//
// Background: native geocoding via `expo-location` was dropped app-wide in
// 2026-06 to kill the location-permission prompt. The web dashboard already
// reverse-geocodes through the public OpenStreetMap **Nominatim** HTTP API
// (see web-app/src/components/AddressInput.tsx). We reuse the same endpoint
// here over plain `fetch` so the new-project / edit-project forms can keep the
// pin and the address text in sync — without re-adding a native dependency or a
// permission prompt.
//
// Nominatim usage policy: keep requests light (callers debounce + abort), bias
// to Georgia, request a single result, and identify the app. See README
// "Known Issues" for the rate-limit caveat at production scale.

import type { LatLng } from '../components/MapPicker';

const NOMINATIM = 'https://nominatim.openstreetmap.org';

/** Sent so Nominatim can attribute traffic, per its usage policy. */
const CONTACT_EMAIL = 'support@hubble.ge';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  /** Human-readable address (Nominatim `display_name`). */
  displayName: string;
}

/**
 * Resolve a free-text address to a single best-match coordinate.
 *
 * Biased to Georgia (`countrycodes=ge`) and Georgian labels
 * (`accept-language=ka`). Returns `null` on no match, network error, or abort —
 * never throws, so callers can treat geocoding as a best-effort enhancement.
 *
 * @param query   The address text to look up.
 * @param signal  Optional AbortSignal so a newer keystroke can cancel an
 *                in-flight request (latest-wins).
 */
export async function forwardGeocode(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodeResult | null> {
  const q = query.trim();
  if (!q) return null;
  try {
    const url =
      `${NOMINATIM}/search?format=json&limit=1&addressdetails=0` +
      `&countrycodes=ge&accept-language=ka&email=${encodeURIComponent(CONTACT_EMAIL)}` +
      `&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    const hit = data?.[0];
    if (!hit) return null;
    const latitude = Number(hit.lat);
    const longitude = Number(hit.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude, displayName: hit.display_name ?? q };
  } catch {
    return null;
  }
}

/**
 * Resolve coordinates to a human-readable address. Returns `null` on no match,
 * network error, or abort (callers typically fall back to a "lat, lng" string).
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const url =
      `${NOMINATIM}/reverse?format=json&accept-language=ka` +
      `&email=${encodeURIComponent(CONTACT_EMAIL)}` +
      `&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as { display_name?: string };
    return data?.display_name ?? null;
  } catch {
    return null;
  }
}

/** "41.71510, 44.82710" — the fallback label when reverse geocoding misses. */
export function coordsLabel(loc: LatLng): string {
  return `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`;
}
