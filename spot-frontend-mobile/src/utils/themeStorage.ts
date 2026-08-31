import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'spot_theme_mode';

export type ThemeMode = 'light' | 'dark';

export async function getCachedThemeMode(): Promise<ThemeMode | null> {
  try {
    const value = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    return value === 'dark' ? 'dark' : value === 'light' ? 'light' : null;
  } catch {
    return null;
  }
}

export async function setCachedThemeMode(mode: ThemeMode): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // best-effort cache, bỏ qua lỗi ghi
  }
}
