import { AxiosError } from 'axios';
import apiClient from './apiClient';

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
  statusCode?: number;
}

/** PATCH /users/me — profile fields only (fullName/gender/avatarUrl). Not
 * the same endpoint as preferencesService (that's /users/me/preferences). */
export async function updateProfile(payload: ProfileUpdatePayload): Promise<ProfileUpdateResult> {
  try {
    const res = await apiClient.patch<{ message: string; user: ProfileUpdateUser }>('/users/me', payload);
    return { success: true, user: res.data.user };
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;

    if (!error.response) {
      return { success: false, message: 'Network error. Please check your connection and try again.' };
    }

    return {
      success: false,
      message: error.response.data?.message || 'Something went wrong. Please try again.',
      statusCode: error.response.status,
    };
  }
}

export async function getProfile(): Promise<ProfileUpdateResult> {
  try {
    const res = await apiClient.get<{ user: ProfileUpdateUser }>('/users/me');
    return { success: true, user: res.data.user };
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;

    if (!error.response) {
      return { success: false, message: 'Network error. Please check your connection and try again.' };
    }

    return {
      success: false,
      message: error.response.data?.message || 'Something went wrong. Please try again.',
      statusCode: error.response.status,
    };
  }
}

export interface MainProfileStats {
  hostedMatches: number;
  joinedMatches: number;
  completedBookings: number;
  reviewsCount: number;
  avgRating: number | null;
  joinedAt: string | null;
}

export interface MainProfileResult {
  success: boolean;
  user?: ProfileUpdateUser;
  stats?: MainProfileStats;
  message?: string;
  statusCode?: number;
}

export async function getMainProfile(): Promise<MainProfileResult> {
  try {
    const res = await apiClient.get<{ user: ProfileUpdateUser; stats: MainProfileStats }>('/users/me/profile');
    return { success: true, user: res.data.user, stats: res.data.stats };
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;

    if (!error.response) {
      return { success: false, message: 'Network error. Please check your connection and try again.' };
    }

    return {
      success: false,
      message: error.response.data?.message || 'Something went wrong. Please try again.',
      statusCode: error.response.status,
    };
  }
}
