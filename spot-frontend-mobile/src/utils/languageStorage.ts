import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language } from '@/i18n/translations';

const LANGUAGE_KEY = 'spot:language';

export async function getStoredLanguage(): Promise<Language | null> {
  try {
    const value = await AsyncStorage.getItem(LANGUAGE_KEY);
    return value === 'en' || value === 'vi' ? value : null;
  } catch {
    return null;
  }
}

export async function setStoredLanguage(lang: Language): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  } catch {
    // Non-critical: worst case app mở lại vẫn English mặc định.
  }
}
