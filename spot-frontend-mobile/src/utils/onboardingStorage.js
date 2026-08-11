import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETED_KEY = 'spot:onboarding_completed';

// TEMP (SPOT-33): disabled while onboarding is still being reviewed, so it
// can be reopened every relaunch instead of being skipped after the first
// Skip/Get Started. Flip back to `true` once onboarding UI is finalized —
// app/index.js, app/onboarding/2.js, app/onboarding/3.js don't need any
// changes when re-enabling, they just call through this module.
const PERSISTENCE_ENABLED = false;

/**
 * Whether the user has already finished (or skipped) the onboarding flow.
 * This is a non-sensitive UI flag, so AsyncStorage is fine here — only auth
 * tokens need expo-secure-store (see .claude/rules/api-conventions.md).
 */
export async function getOnboardingCompleted() {
  if (!PERSISTENCE_ENABLED) return false;
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
    return value === 'true';
  } catch (error) {
    return false;
  }
}

export async function setOnboardingCompleted() {
  if (!PERSISTENCE_ENABLED) return;
  try {
    await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
  } catch (error) {
    // Non-critical: worst case the user sees onboarding again next launch.
  }
}
