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
 * Match Map — Figma "Paper-plane = directions, not share"). Navigates to
 * SPOT's own venue map (app/matches/venue-map.tsx) when coords exist;
 * without them there's nothing to plot on our map, so it falls back to
 * openDirections() (external app, accepts a free-text address).
 */
export function openVenueDirections(router: ImperativeRouter, venue: Venue): void {
  if (venue.latitude == null || venue.longitude == null) {
    openDirections(venue);
    return;
  }
  router.push({
    pathname: '/matches/venue-map',
    params: {
      venueName: venue.venueName,
      venueAddress: venue.venueAddress,
      latitude: String(venue.latitude),
      longitude: String(venue.longitude),
    },
  });
}
