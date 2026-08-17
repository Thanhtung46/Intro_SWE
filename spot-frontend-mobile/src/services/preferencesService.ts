import axios, { AxiosError, AxiosInstance } from 'axios';
import { API_URL } from '../config/env';
import { getToken } from '../utils/authStorage';

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

const client: AxiosInstance = axios.create();

async function authHeader() {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getPreferences(): Promise<PreferencesResult> {
  try {
    const headers = await authHeader();
    const res = await client.get<{ preferences: Preferences }>(`${API_URL}/users/me/preferences`, { headers });
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
    const headers = await authHeader();
    const res = await client.patch<{ message: string; preferences: Preferences }>(
      `${API_URL}/users/me/preferences`,
      patch,
      { headers }
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
