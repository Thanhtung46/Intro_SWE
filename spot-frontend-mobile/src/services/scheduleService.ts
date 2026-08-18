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

const client: AxiosInstance = axios.create();

/** GET /users/me/schedule — from/to là YYYY-MM-DD (theo lịch đang xem, mặc định do BE tự chọn nếu bỏ trống). */
export async function getMySchedule(
  params: { from?: string; to?: string; type?: 'all' | 'booking' | 'match'; limit?: number } = {},
): Promise<ScheduleResult> {
  try {
    const token = await getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const queryParams: Record<string, string | number> = {
      type: params.type ?? 'all',
      limit: params.limit ?? 100,
    };
    if (params.from) queryParams.from = params.from;
    if (params.to) queryParams.to = params.to;
    const res = await client.get<{ items: ScheduleItem[] }>(`${API_URL}/users/me/schedule`, {
      headers,
      params: queryParams,
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
