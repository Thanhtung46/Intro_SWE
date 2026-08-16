import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'spot:auth_token';

/**
 * Auth token storage — expo-secure-store on native (see
 * .claude/rules/api-conventions.md). `expo-secure-store` has NO web
 * implementation at all (its web build is a literal `export default {}`),
 * so on web this falls back to `window.localStorage` instead — purely so
 * the app is testable via `npm run web` (dev/QA convenience, same trade-off
 * every Expo app with SecureStore auth makes; native behavior is
 * unchanged). Not AsyncStorage — that's a separate React Native module,
 * this is the browser's own storage on the actual web platform.
 */
export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return window.localStorage.getItem(AUTH_TOKEN_KEY);
    } catch (error) {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch (error) {
      // Non-critical.
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    // Non-critical: worst case a stale key lingers until next write.
  }
}
