import Constants from 'expo-constants';
import { Platform } from 'react-native';

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
