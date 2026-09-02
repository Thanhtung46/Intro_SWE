import * as Location from 'expo-location';

export type PositionResult =
  | { ok: true; latitude: number; longitude: number }
  | { ok: false; reason: 'denied' | 'unavailable' };

// getCurrentPositionAsync can hang for a long time on an emulator with no
// location set, or on a device still acquiring a fix — cap the wait so the
// caller can fall back instead of showing a spinner indefinitely.
const FIX_TIMEOUT_MS = 12_000;

function timeout<T>(ms: number): Promise<T> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('location timeout')), ms));
}

/**
 * Ask for foreground location permission (the OS prompts at most once ever —
 * it remembers the choice) and read the device's position: a *fresh* fix
 * first (`getCurrentPositionAsync`, timed out), falling back to the last
 * known fix only if that fails.
 *
 * Order matters: `getLastKnownPositionAsync` can return a very stale
 * position (e.g. an emulator's old default before its location was
 * changed), which for a "route to this venue" feature produces a wrong or
 * un-routable path — so it's the fallback, not the primary.
 *
 * Returns a discriminated result so the caller can tell "user declined"
 * from "location services off / no fix" and show the right message. The 3
 * filter sheets still inline their own perm+fix pair — folding them onto
 * this is a later cleanup.
 */
export async function requestCurrentPosition(): Promise<PositionResult> {
  let status: Location.PermissionStatus;
  try {
    ({ status } = await Location.requestForegroundPermissionsAsync());
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
  if (status !== 'granted') return { ok: false, reason: 'denied' };

  try {
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      timeout<Location.LocationObject>(FIX_TIMEOUT_MS),
    ]);
    return { ok: true, latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    // fresh fix hung / failed — try a cached one before giving up
  }

  try {
    const last = await Location.getLastKnownPositionAsync();
    if (last) return { ok: true, latitude: last.coords.latitude, longitude: last.coords.longitude };
  } catch {
    // ignore
  }

  return { ok: false, reason: 'unavailable' };
}
