import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'spot:auth_token';

/**
 * Auth token storage — always via expo-secure-store, never AsyncStorage
 * (see .claude/rules/api-conventions.md). Nothing writes a token yet since
 * login isn't built in this flow; `getToken` always resolves `null` until
 * it does. Splash reads this to decide onboarding/choose-role vs. straight
 * into the app.
 */
export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    // Non-critical: worst case a stale key lingers until next write.
  }
}
