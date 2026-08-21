import axios from 'axios';

import { GEOAPIFY_API_KEY } from '@/config/env';

// Direct calls to Geoapify's Geocoding API — not routed through apiClient
// (different host, no backend auth). Backs PinDropModal's "find it on the
// map" fallback (SPOT-76 Host form §2): search-to-jump, and reverse
// geocoding the final pin so HostMatchScreen can prefill Address +
// Province/Ward (still editable — see vnAdminMatch.ts, matching is
// best-effort against spot-backend's pre-2025 GSO admin names).
const AUTOCOMPLETE_URL = 'https://api.geoapify.com/v1/geocode/autocomplete';
const REVERSE_URL = 'https://api.geoapify.com/v1/geocode/reverse';

export type GeoapifyPlace = {
  formatted: string;
  latitude: number;
  longitude: number;
  /** Province-level admin name (e.g. "Thành phố Hồ Chí Minh") — fed to vnAdminMatch. */
  state?: string;
  /** District/ward-level admin name (e.g. "Quận 7") — fed to vnAdminMatch. */
  county?: string;
  city?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapResult(r: any): GeoapifyPlace {
  return { formatted: r.formatted, latitude: r.lat, longitude: r.lon, state: r.state, county: r.county, city: r.city };
}

export async function searchAddress(query: string): Promise<GeoapifyPlace[]> {
  const text = query.trim();
  if (!GEOAPIFY_API_KEY || text.length < 3) return [];
  try {
    const res = await axios.get(AUTOCOMPLETE_URL, {
      params: { text, filter: 'countrycode:vn', format: 'json', limit: 5, apiKey: GEOAPIFY_API_KEY },
    });
    return (res.data?.results ?? []).map(mapResult);
  } catch {
    throw new Error('Could not search addresses. Please try again.');
  }
}

/** Resolves a dropped/dragged pin back to an address + admin names. Returns null on failure/no key — caller falls back to manual entry. */
export async function reverseGeocode(latitude: number, longitude: number): Promise<GeoapifyPlace | null> {
  if (!GEOAPIFY_API_KEY) return null;
  try {
    const res = await axios.get(REVERSE_URL, {
      params: { lat: latitude, lon: longitude, format: 'json', apiKey: GEOAPIFY_API_KEY },
    });
    const first = res.data?.results?.[0];
    return first ? mapResult(first) : null;
  } catch {
    return null;
  }
}
