import Constants from 'expo-constants';
import { Platform } from 'react-native';

const BACKEND_PORT = 3000;

/**
 * `localhost` only reaches the backend when the app itself is running on
 * the same machine as `spot-backend` (web dev, iOS Simulator). On a real
 * phone (Expo Go / dev client, or the mobile browser over LAN) `localhost`
 * resolves to the phone itself, so every request silently fails — this
 * derives the dev machine's actual LAN IP instead, same trick Expo uses
 * to let the phone find the Metro bundler in the first place.
 */
function resolveApiBaseUrl(): string {
  // Native (Expo Go / dev client): hostUri is set by the bundler to
  // "<lan-ip>:8081" — reuse that IP, just against the backend's port.
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

  // Desktop web dev / iOS Simulator — same machine as the backend.
  return `http://localhost:${BACKEND_PORT}`;
}

export const API_URL = `${resolveApiBaseUrl()}/api`;

const DEFAULT_LOCAL = 'http://localhost:3000/api';
const ANDROID_EMULATOR = 'http://10.0.2.2:3000/api';

type ExpoExtra = {
  apiUrl?: string;
  apiUrlAndroid?: string;
};

function resolveApiUrl(): string {
  const extra = Constants.expoConfig?.extra as ExpoExtra | undefined;

  if (Platform.OS === 'android') {
    return extra?.apiUrlAndroid ?? ANDROID_EMULATOR;
  }

  return extra?.apiUrl ?? DEFAULT_LOCAL;
}

/** Backend REST base (includes `/api`). Android emulator uses 10.0.2.2 to reach host localhost. */
export const API_URL = resolveApiUrl();

// Flip to false to point authService at the real API_URL; no UI code changes needed.
export const USE_MOCK_API = false;
