import { Linking } from 'react-native';
import type { ImperativeRouter } from 'expo-router';

type Venue = {
  latitude: number | null;
  longitude: number | null;
  venueName: string;
  venueAddress: string;
};

/**
 * Opens the device's default maps app with turn-by-turn directions.
 * Low-level fallback when in-app routing cannot run (no coords / permission /
 * web). Primary UX is openVenueDirections → VenueMapScreen + Geoapify.
 */
export function openDirections(venue: Venue): void {
  const destination =
    venue.latitude != null && venue.longitude != null
      ? `${venue.latitude},${venue.longitude}`
      : `${venue.venueName}, ${venue.venueAddress}`;
  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
  Linking.openURL(url).catch(() => undefined);
}

/**
 * Paper-plane / Map CTA — opens SPOT's in-app VenueMapScreen (`/venue-map`)
 * for match, group, tournament, and referee flows. Never jumps straight to
 * an external maps app.
 */
export function openVenueDirections(router: ImperativeRouter, venue: Venue): void {
  router.push({
    pathname: '/venue-map',
    params: {
      venueName: venue.venueName,
      venueAddress: venue.venueAddress,
      ...(venue.latitude != null && venue.longitude != null
        ? { latitude: String(venue.latitude), longitude: String(venue.longitude) }
        : {}),
    },
  });
}
