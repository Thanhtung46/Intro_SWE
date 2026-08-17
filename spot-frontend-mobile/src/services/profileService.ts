import axios, { AxiosError, AxiosInstance } from 'axios';
import { API_URL } from '../config/env';
import { getToken } from '../utils/authStorage';

export interface ProfileUpdatePayload {
  fullName?: string;
  gender?: string;
}

export interface ProfileUpdateUser {
  userId?: number;
  email?: string;
  fullName?: string;
  phoneNumber?: string;
  role?: string;
  status?: string;
  gender?: string;
  avatarUrl?: string | null;
}

export interface ProfileUpdateResult {
  success: boolean;
  user?: ProfileUpdateUser;
  message?: string;
}

const client: AxiosInstance = axios.create();

/** PATCH /users/me — profile fields only (fullName/gender/avatarUrl). Not
 * the same endpoint as preferencesService (that's /users/me/preferences). */
export async function updateProfile(payload: ProfileUpdatePayload): Promise<ProfileUpdateResult> {
  try {
    const token = await getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await client.patch<{ message: string; user: ProfileUpdateUser }>(
      `${API_URL}/users/me`,
      payload,
      { headers }
    );
    return { success: true, user: res.data.user };
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;

    if (!error.response) {
      return { success: false, message: 'Network error. Please check your connection and try again.' };
    }

    return { success: false, message: error.response.data?.message || 'Something went wrong. Please try again.' };
  }
}

export async function getProfile(): Promise<ProfileUpdateResult> {
  try {
    const token = await getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await client.get<{ user: ProfileUpdateUser }>(`${API_URL}/users/me`, { headers });
    return { success: true, user: res.data.user };
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;

    if (!error.response) {
      return { success: false, message: 'Network error. Please check your connection and try again.' };
    }

    return { success: false, message: error.response.data?.message || 'Something went wrong. Please try again.' };
  }
}
