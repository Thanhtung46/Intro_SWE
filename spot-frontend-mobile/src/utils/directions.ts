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
 * match's venue. Google Maps' universal `/maps/dir/?api=1` link opens the
 * native Google/Apple Maps app when installed, falling back to the browser
 * otherwise. Used as the fallback action inside VenueMapScreen (real
 * turn-by-turn needs the user's GPS + a routing API call — not built yet)
 * and directly wherever coords are missing (see openVenueDirections below).
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
 * The paper-plane icon's actual handler (MatchCard, Check Profile, Join
 * Match Map — Figma "Paper-plane = directions, not share"). Always opens
 * SPOT's own venue map (app/matches/venue-map.tsx) first — never jumps
 * straight to the external Maps app. VenueMapScreen itself shows an
 * "Open in Google Maps" button (openDirections(), above) for when the host
 * actually wants turn-by-turn directions; without lat/lng it falls back to
 * a text-only view there instead of a pin (see VenueMapScreen.tsx).
 */
export function openVenueDirections(router: ImperativeRouter, venue: Venue): void {
  router.push({
    pathname: '/matches/venue-map',
    params: {
      venueName: venue.venueName,
      venueAddress: venue.venueAddress,
      ...(venue.latitude != null && venue.longitude != null
        ? { latitude: String(venue.latitude), longitude: String(venue.longitude) }
        : {}),
    },
  });
}
