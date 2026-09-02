import { GEOAPIFY_API_KEY } from '@/config/env';

export type LatLng = { latitude: number; longitude: number };

export type RouteResult = {
  /** Leaflet order: [lat, lng][] */
  coordinates: [number, number][];
  distanceMeters: number;
  timeSeconds: number;
};

/**
 * In-app driving route via Geoapify Routing API (same key as map tiles).
 * Returns polyline coords for AppMap + distance/time for the footer.
 */
export async function fetchDrivingRoute(from: LatLng, to: LatLng): Promise<RouteResult> {
  if (!GEOAPIFY_API_KEY) {
    throw new Error('Map routing is not configured.');
  }

  const waypoints = `${from.latitude},${from.longitude}|${to.latitude},${to.longitude}`;
  const url =
    `https://api.geoapify.com/v1/routing?waypoints=${encodeURIComponent(waypoints)}` +
    `&mode=drive&apiKey=${GEOAPIFY_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Could not calculate a route from your location.');
  }

  const json = (await res.json()) as {
    features?: Array<{
      properties?: { distance?: number; time?: number };
      geometry?: { type?: string; coordinates?: number[][][] | number[][] };
    }>;
  };

  const feature = json.features?.[0];
  if (!feature?.geometry) {
    throw new Error('No route found between you and this venue.');
  }

  const raw = feature.geometry.coordinates;
  // GeoJSON: MultiLineString → [ [ [lon,lat], ... ] ] or LineString → [ [lon,lat], ... ]
  const line =
    feature.geometry.type === 'MultiLineString'
      ? (raw as number[][][]).flat()
      : (raw as number[][]);

  const coordinates: [number, number][] = line.map(([lon, lat]) => [lat, lon]);
  if (coordinates.length < 2) {
    throw new Error('No route found between you and this venue.');
  }

  return {
    coordinates,
    distanceMeters: Number(feature.properties?.distance ?? 0),
    timeSeconds: Number(feature.properties?.time ?? 0),
  };
}

export function formatRouteDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatRouteDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}
