import { Alert, Platform } from 'react-native';

/**
 * Cross-platform alert. `Alert.alert()` is a no-op on web
 * (react-native-web's implementation is a literal `static alert() {}`) —
 * this falls back to `window.alert` there so messages are actually seen.
 */
export function showAlert(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
