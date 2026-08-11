import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETED_KEY = 'spot:onboarding_completed';

/**
 * Whether the user has already finished (or skipped) the onboarding flow.
 * This is a non-sensitive UI flag, so AsyncStorage is fine here — only auth
 * tokens need expo-secure-store (see .claude/rules/api-conventions.md).
 */
export async function getOnboardingCompleted() {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
    return value === 'true';
  } catch (error) {
    return false;
  }
}

export async function setOnboardingCompleted() {
  try {
    await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
  } catch (error) {
    // Non-critical: worst case the user sees onboarding again next launch.
  }
}
