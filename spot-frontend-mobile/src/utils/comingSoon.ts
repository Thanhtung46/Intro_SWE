import { Alert } from 'react-native';

/** Shared placeholder for features that don't have a real screen/API yet. */
export function comingSoon(feature: string): void {
  Alert.alert('Coming soon', `${feature} is not available yet.`);
}
