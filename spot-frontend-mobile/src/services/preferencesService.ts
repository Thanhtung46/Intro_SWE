import { AxiosError } from 'axios';
import apiClient from './apiClient';

export type Language = 'en' | 'vi';
export type Appearance = 'light' | 'dark' | 'system';

export interface Preferences {
  language: Language;
  appearance: Appearance;
  pushNotificationsEnabled: boolean;
  locationServicesEnabled: boolean;
}

export interface PreferencesResult {
  success: boolean;
  preferences?: Preferences;
  message?: string;
}

export async function getPreferences(): Promise<PreferencesResult> {
  try {
    const res = await apiClient.get<{ preferences: Preferences }>('/users/me/preferences');
    return { success: true, preferences: res.data.preferences };
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;

    if (!error.response) {
      return { success: false, message: 'Network error. Please check your connection and try again.' };
    }

    return { success: false, message: error.response.data?.message || 'Something went wrong. Please try again.' };
  }
}

export async function updatePreferences(patch: Partial<Preferences>): Promise<PreferencesResult> {
  try {
    const res = await apiClient.patch<{ message: string; preferences: Preferences }>(
      '/users/me/preferences',
      patch,
    );
    return { success: true, preferences: res.data.preferences };
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;

    if (!error.response) {
      return { success: false, message: 'Network error. Please check your connection and try again.' };
    }

    return { success: false, message: error.response.data?.message || 'Something went wrong. Please try again.' };
  }
}
