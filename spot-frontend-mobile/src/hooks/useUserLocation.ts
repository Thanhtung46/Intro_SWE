import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export type UserLocation = { latitude: number; longitude: number };

/**
 * Best-effort current GPS position for distance-to-venue display (Home,
 * Booking venue lists/map). Requests foreground permission once on mount;
 * denied/unavailable/simulator-without-location just resolves to `null` —
 * same silent-omit convention as HomeScreen's "Suggested for you" section
 * (FR-004, spec 004-ai-features-frontend-integration) rather than an Alert,
 * since a missing distance is a minor degradation, not a blocking error.
 */
export default function useUserLocation(): UserLocation | null {
  const [location, setLocation] = useState<UserLocation | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({});
        if (!cancelled) {
          setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        }
      } catch {
        // Silent — venue distance just falls back to "—".
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return location;
}
