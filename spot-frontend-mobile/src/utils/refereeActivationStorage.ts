import AsyncStorage from '@react-native-async-storage/async-storage';

const REFEREE_ACTIVATION_SEEN_KEY = 'spot:referee_activation_seen';

/**
 * Whether the one-time "Account Activated!" celebration has already been shown.
 * LoginScreen routes every REFEREE login to that screen; this flag makes it a
 * one-time thing (later logins go straight to the Job Board). Non-sensitive UI
 * flag → AsyncStorage is fine, same as onboardingStorage.ts.
 */
export async function getRefereeActivationSeen(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(REFEREE_ACTIVATION_SEEN_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function setRefereeActivationSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(REFEREE_ACTIVATION_SEEN_KEY, 'true');
  } catch {
    // Non-critical: worst case the referee sees the celebration once more.
  }
}
