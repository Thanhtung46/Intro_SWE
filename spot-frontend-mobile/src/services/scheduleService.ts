import { AxiosError } from 'axios';
import apiClient from './apiClient';

export interface ScheduleItem {
  type: 'BOOKING' | 'MATCH';
  bookingId: number | null;
  matchId: number | null;
  startsAt: string;
  endsAt: string;
  bookingDate: string;
  status: string;
  /** Server-computed time bucket — render as-is, never re-derive from startsAt/endsAt on the client. */
  displayStatus: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  venueName: string;
  fieldName: string;
  address: string;
  sportType: string;
  role?: 'HOST' | 'PARTICIPANT' | null;
  /** Only non-null for type: 'MATCH'. */
  hostName?: string | null;
  /** Server-sourced (schema_review.reviews) — true only for BOOKING items with an existing review. Survives refetch/remount, unlike a purely local "just submitted" flag. */
  alreadyReviewed?: boolean;
  totalAmountVnd: number | null;
}

export interface ScheduleResult {
  success: boolean;
  items?: ScheduleItem[];
  message?: string;
}

/** GET /users/me/schedule — from/to là YYYY-MM-DD (theo lịch đang xem, mặc định do BE tự chọn nếu bỏ trống). */
export async function getMySchedule(
  params: { from?: string; to?: string; type?: 'all' | 'booking' | 'match'; limit?: number } = {},
): Promise<ScheduleResult> {
  try {
    const queryParams: Record<string, string | number> = {
      type: params.type ?? 'all',
      limit: params.limit ?? 100,
    };
    if (params.from) queryParams.from = params.from;
    if (params.to) queryParams.to = params.to;
    const res = await apiClient.get<{ items: ScheduleItem[] }>('/users/me/schedule', {
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
