import { AxiosError } from 'axios';
import apiClient from './apiClient';

export interface ScheduleItem {
  type: 'BOOKING' | 'MATCH';
  bookingId: number;
  matchId: number | null;
  startsAt: string;
  endsAt: string;
  bookingDate: string;
  status: string;
  venueName: string;
  fieldName: string;
  address: string;
  sportType: string;
  role?: 'HOST' | 'PARTICIPANT';
}

export interface ScheduleResult {
  success: boolean;
  items?: ScheduleItem[];
  message?: string;
}

/** GET /users/me/schedule — from/to là YYYY-MM-DD (theo lịch đang xem). */
export async function getMySchedule(params: { from: string; to: string }): Promise<ScheduleResult> {
  try {
    const res = await apiClient.get<{ items: ScheduleItem[] }>('/users/me/schedule', {
      params: { type: 'all', from: params.from, to: params.to, limit: 100 },
    });
    return { success: true, items: res.data.items };
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;
    if (!error.response) {
      return { success: false, message: 'Network error. Please check your connection and try again.' };
    }
    return { success: false, message: error.response.data?.message || 'Something went wrong. Please try again.' };
  }
}
