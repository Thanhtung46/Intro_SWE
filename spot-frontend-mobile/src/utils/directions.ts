import { Linking } from 'react-native';
import type { ImperativeRouter } from 'expo-router';

type Venue = {
  latitude: number | null;
  longitude: number | null;
  venueName: string;
  venueAddress: string;
};

/**
 * Opens the device's default maps app with GPS turn-by-turn directions to a
 * venue. Google Maps' universal `/maps/dir/?api=1` link opens the
 * native Google/Apple Maps app when installed, falling back to the browser
 * otherwise. VenueMapScreen draws its own in-app motorcycle route line
 * (Geoapify Routing) as the primary action now; this is the fallback there
 * when that can't run (no coords / permission declined / routing error /
 * web) and works off venueName/venueAddress even without coords.
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
 * The shared "open the venue on SPOT's map" handler — the paper-plane icon
 * (MatchCard, Check Profile, Join Match Map — Figma "Paper-plane =
 * directions, not share") and the venue mini-map on Match / Group /
 * Tournament detail. Always opens SPOT's own venue map (app/venue-map.tsx)
 * first — never jumps straight to the external Maps app. VenueMapScreen's
 * "Directions" button then draws an in-app motorcycle route line, or falls
 * back to openDirections() above; without lat/lng it shows a text-only view
 * there instead of a pin (see VenueMapScreen.tsx).
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
