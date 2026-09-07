import * as Location from 'expo-location';
import { Alert } from 'react-native';

import { getPreferences, updatePreferences } from '@/services/preferencesService';

export type PositionFailReason = 'denied' | 'unavailable' | 'pref_off';

export type PositionResult =
  | { ok: true; latitude: number; longitude: number }
  | { ok: false; reason: PositionFailReason };

export type RequestPositionOptions = {
  /**
   * When the in-app Location Services preference is off, show Allow / Don't
   * allow and turn it on automatically if the user allows. Use on explicit
   * actions (Distance Apply, Directions, locate). Keep false for silent
   * warm-starts so homepage/map don't interrupt.
   */
  offerEnable?: boolean;
};

// getCurrentPositionAsync can hang for a long time on an emulator with no
// location set, or on a device still acquiring a fix — cap the wait so the
// caller can fall back instead of showing a spinner indefinitely.
const FIX_TIMEOUT_MS = 15_000;
const PREFS_CACHE_TTL_MS = 30_000;

let prefsCache: { enabled: boolean; at: number } | null = null;

function timeout<T>(ms: number): Promise<T> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('location timeout')), ms));
}

/** Call after Settings toggles Location Services so the next GPS read is fresh. */
export function invalidateLocationPrefsCache(): void {
  prefsCache = null;
}

/**
 * App-level Location Services preference (Settings toggle). Defaults to
 * `true` when prefs can't be loaded so we don't soft-lock GPS on a network blip.
 */
export async function isAppLocationEnabled(): Promise<boolean> {
  if (prefsCache && Date.now() - prefsCache.at < PREFS_CACHE_TTL_MS) {
    return prefsCache.enabled;
  }
  const result = await getPreferences();
  const enabled = result.success ? Boolean(result.preferences?.locationServicesEnabled) : true;
  prefsCache = { enabled, at: Date.now() };
  return enabled;
}

function askAllowLocation(): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    Alert.alert(
      'Allow location access?',
      'SPOT uses your location for nearby matches, distance filter, and directions.',
      [
        { text: "Don't allow", style: 'cancel', onPress: () => finish(false) },
        { text: 'Allow', onPress: () => finish(true) },
      ],
      { cancelable: true, onDismiss: () => finish(false) }
    );
  });
}

async function turnOnAppLocationPreference(): Promise<boolean> {
  const result = await updatePreferences({ locationServicesEnabled: true });
  if (!result.success) return false;
  prefsCache = { enabled: true, at: Date.now() };
  return true;
}

async function readDevicePosition(): Promise<PositionResult> {
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

/**
 * Ask for foreground location permission (the OS prompts at most once ever —
 * it remembers the choice) and read the device's position: a *fresh* fix
 * first (`getCurrentPositionAsync`, timed out), falling back to the last
 * known fix only if that fails.
 *
 * If the in-app Location Services preference is off and `offerEnable` is true,
 * shows Allow / Don't allow and turns the preference on when the user allows —
 * no redirect to Settings.
 */
export async function requestCurrentPosition(
  options: RequestPositionOptions = {}
): Promise<PositionResult> {
  const { offerEnable = false } = options;

  let appEnabled = await isAppLocationEnabled();
  if (!appEnabled) {
    if (!offerEnable) return { ok: false, reason: 'pref_off' };
    const allowed = await askAllowLocation();
    if (!allowed) return { ok: false, reason: 'pref_off' };
    const saved = await turnOnAppLocationPreference();
    if (!saved) return { ok: false, reason: 'unavailable' };
    appEnabled = true;
  }

  return readDevicePosition();
}

/** Great-circle distance in km (WGS84 approx). */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Card / list label — `800 m` under 1 km, else `1.2 km`. */
export function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km) || km < 0) return '';
  if (km < 1) return `${Math.max(1, Math.round(km * 1000))} m`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

export function positionErrorMessage(reason: PositionFailReason): string {
  if (reason === 'pref_off') {
    return 'Location access was not enabled. You can try again anytime.';
  }
  if (reason === 'denied') {
    return 'Location permission was not granted. You can try again or turn it on later in Settings.';
  }
  return "Couldn't get your current location. Check GPS is on, then try again — or switch back to Location.";
}

/**
 * Alert when GPS is needed but blocked.
 * - `pref_off`: no-op (Allow/Don't allow was already shown in `requestCurrentPosition`).
 * - `denied` / `unavailable`: informative OK only — no forced Settings redirect.
 */
export function promptLocationFailure(reason: PositionFailReason): void {
  if (reason === 'pref_off') return;

  if (reason === 'denied') {
    Alert.alert('Location permission needed', positionErrorMessage(reason), [
      { text: 'OK', style: 'cancel' },
    ]);
    return;
  }

  Alert.alert('Location unavailable', positionErrorMessage(reason));
}
