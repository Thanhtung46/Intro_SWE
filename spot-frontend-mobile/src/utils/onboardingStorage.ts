import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETED_KEY = 'spot:onboarding_completed';

// TEMP: disabled while onboarding is still being reworked (single-screen
// rebuild), so it reopens every relaunch instead of getting skipped after
// the first Skip/Get started. Flip back to `true` once the UI is final —
// app/index.tsx and app/onboarding.tsx don't need any changes when
// re-enabling, they just call through this module.
const PERSISTENCE_ENABLED = false;

/**
 * Whether the user has already finished (or skipped) the onboarding flow.
 * This is a non-sensitive UI flag, so AsyncStorage is fine here — only auth
 * tokens need expo-secure-store (see .claude/rules/api-conventions.md).
 */
export async function getOnboardingCompleted(): Promise<boolean> {
  if (!PERSISTENCE_ENABLED) return false;
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
    return value === 'true';
  } catch (error) {
    return false;
  }
}

export async function setOnboardingCompleted(): Promise<void> {
  if (!PERSISTENCE_ENABLED) return;
  try {
    await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
  } catch (error) {
    // Non-critical: worst case the user sees onboarding again next launch.
  }
}
