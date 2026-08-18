import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'spot_auth_access_token';
const REFRESH_TOKEN_KEY = 'spot_auth_refresh_token';

/** Legacy keys — colon in access key is invalid for SecureStore on native. */
const LEGACY_ACCESS_TOKEN_KEY = 'spot:auth_token';
const LEGACY_REFRESH_TOKEN_KEY = 'refreshToken';

/**
 * Auth token storage — expo-secure-store on native. SecureStore keys must
 * contain only alphanumeric characters, ".", "-", and "_" (no ":").
 * On web, falls back to window.localStorage for dev/QA via `npm run web`.
 */
async function readNative(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function writeNative(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

async function deleteNative(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Non-critical.
  }
}

function readWeb(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeWeb(key: string, value: string): void {
  window.localStorage.setItem(key, value);
}

function deleteWeb(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Non-critical.
  }
}

async function migrateLegacyAccessToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    const legacy = readWeb(LEGACY_ACCESS_TOKEN_KEY);
    if (legacy) {
      writeWeb(ACCESS_TOKEN_KEY, legacy);
      deleteWeb(LEGACY_ACCESS_TOKEN_KEY);
      return legacy;
    }
    return null;
  }

  const legacy = await readNative(LEGACY_ACCESS_TOKEN_KEY);
  if (legacy) {
    await writeNative(ACCESS_TOKEN_KEY, legacy);
    await deleteNative(LEGACY_ACCESS_TOKEN_KEY);
    return legacy;
  }
  return null;
}

async function migrateLegacyRefreshToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    const legacy = readWeb(LEGACY_REFRESH_TOKEN_KEY);
    if (legacy) {
      writeWeb(REFRESH_TOKEN_KEY, legacy);
      deleteWeb(LEGACY_REFRESH_TOKEN_KEY);
      return legacy;
    }
    return null;
  }

  const legacy = await readNative(LEGACY_REFRESH_TOKEN_KEY);
  if (legacy) {
    await writeNative(REFRESH_TOKEN_KEY, legacy);
    await deleteNative(LEGACY_REFRESH_TOKEN_KEY);
    return legacy;
  }
  return null;
}

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return readWeb(ACCESS_TOKEN_KEY) ?? (await migrateLegacyAccessToken());
  }

  const current = await readNative(ACCESS_TOKEN_KEY);
  if (current) return current;
  return migrateLegacyAccessToken();
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    writeWeb(ACCESS_TOKEN_KEY, token);
    return;
  }
  await writeNative(ACCESS_TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === 'web') {
    deleteWeb(ACCESS_TOKEN_KEY);
    deleteWeb(LEGACY_ACCESS_TOKEN_KEY);
    return;
  }
  await deleteNative(ACCESS_TOKEN_KEY);
  await deleteNative(LEGACY_ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return readWeb(REFRESH_TOKEN_KEY) ?? (await migrateLegacyRefreshToken());
  }

  const current = await readNative(REFRESH_TOKEN_KEY);
  if (current) return current;
  return migrateLegacyRefreshToken();
}

export async function setRefreshToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    writeWeb(REFRESH_TOKEN_KEY, token);
    return;
  }
  await writeNative(REFRESH_TOKEN_KEY, token);
}

export async function clearRefreshToken(): Promise<void> {
  if (Platform.OS === 'web') {
    deleteWeb(REFRESH_TOKEN_KEY);
    deleteWeb(LEGACY_REFRESH_TOKEN_KEY);
    return;
  }
  await deleteNative(REFRESH_TOKEN_KEY);
  await deleteNative(LEGACY_REFRESH_TOKEN_KEY);
}

export async function clearAllTokens(): Promise<void> {
  await clearToken();
  await clearRefreshToken();
}
