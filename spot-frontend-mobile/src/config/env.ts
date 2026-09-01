import Constants from 'expo-constants';
import { Platform } from 'react-native';

const BACKEND_PORT = 3000;

/**
 * `localhost` only reaches the backend when the app itself is running on
 * the same machine as `spot-backend` (web dev, iOS Simulator). On a real
 * phone (Expo Go / dev client, or the mobile browser over LAN) `localhost`
 * resolves to the phone itself, so every request silently fails — this
 * derives the dev machine's actual LAN IP instead, same trick Expo uses
 * to let the phone find the Metro bundler in the first place. Works for
 * any network without editing `app.json` per developer/WiFi.
 */
function resolveApiBaseUrl(): string {
  // Native (Expo Go / dev client, incl. Android emulator): hostUri is set
  // by the bundler to "<lan-ip>:8081" — reuse that IP, just against the
  // backend's port.
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:${BACKEND_PORT}`;
    }
  }

  // Web opened directly from a phone browser via the dev machine's LAN IP
  // (e.g. http://192.168.1.5:8081) — reuse whatever host the page loaded from.
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:${BACKEND_PORT}`;
    }
  }

  // Fallback for an Android emulator that reports "localhost" as its
  // hostUri: 10.0.2.2 is the emulator's alias for the host machine.
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${BACKEND_PORT}`;
  }

  // Desktop web dev / iOS Simulator — same machine as the backend.
  return `http://localhost:${BACKEND_PORT}`;
}

/** Backend REST base (includes `/api`). */
export const API_URL = `${resolveApiBaseUrl()}/api`;

/**
 * Geoapify raster tile key (free tier — no billing account, unlike Google
 * Maps). Read from process.env.EXPO_PUBLIC_* — Expo's built-in .env support
 * (SDK 49+, no extra package): Metro inlines any EXPO_PUBLIC_-prefixed var
 * from `.env` at build time. `.env` is gitignored, so the real key never
 * hits source control (unlike the app.json `expo.extra` path this used
 * before — .env.example documents the var name for a fresh checkout). This
 * is still a client-embedded map-tile key, not a backend secret: every
 * mobile map SDK key (Google's included) ships inside the app bundle the
 * same way — protect it via Geoapify's dashboard domain/referrer allowlist,
 * not by keeping it out of the built app.
 */
export const GEOAPIFY_API_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY;

/** XYZ tile URL template for react-native-maps' <UrlTile> — undefined if no key is configured. */
export const GEOAPIFY_TILE_URL_TEMPLATE = GEOAPIFY_API_KEY
  ? `https://maps.geoapify.com/v1/tile/carto/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_API_KEY}`
  : undefined;
