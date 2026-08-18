import axios, { AxiosError, AxiosInstance } from 'axios';
import { API_URL } from '../config/env';
import { getToken } from '../utils/authStorage';

export interface CreateBookingPayload {
  fieldId: number;
  bookingDate: string;
  startTime: string;
  endTime: string;
}

export interface PublicBooking {
  bookingId: number;
  fieldId: number;
  bookingDate: string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  depositAmount: number;
  status: string;
}

export interface CreateBookingResult {
  success: boolean;
  booking?: PublicBooking;
  message?: string;
}

export interface BookingFailure {
  fieldId: number;
  bookingDate: string;
  startTime: string;
  endTime: string;
  message: string;
}

export interface CreateBookingsBulkResult {
  success: boolean;
  totalRequested?: number;
  totalCreated?: number;
  created?: PublicBooking[];
  failed?: BookingFailure[];
  message?: string;
}

const client: AxiosInstance = axios.create();

/** POST /bookings */
export async function createBooking(
  payload: CreateBookingPayload,
): Promise<CreateBookingResult> {
  try {
    const token = await getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await client.post<{ booking: PublicBooking }>(`${API_URL}/bookings`, payload, {
      headers,
    });
    return { success: true, booking: res.data.booking };
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;
    if (!error.response) {
      return { success: false, message: 'Network error. Please check your connection and try again.' };
    }
    return { success: false, message: error.response.data?.message || 'Something went wrong. Please try again.' };
  }
}

/**
 * POST /bookings/bulk — book multiple field/time slots in one request
 * (multi-pitch and/or multi-slot). Partial success is normal: `success:
 * true` here just means the request was processed at all (200/409 both
 * carry a totalCreated/created/failed breakdown) — check `totalCreated`
 * to see how many actually booked.
 */
export async function createBookingsBulk(payload: {
  bookings: CreateBookingPayload[];
}): Promise<CreateBookingsBulkResult> {
  try {
    const token = await getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await client.post<{
      totalRequested: number;
      totalCreated: number;
      created: PublicBooking[];
      failed: BookingFailure[];
    }>(`${API_URL}/bookings/bulk`, payload, { headers });
    return {
      success: true,
      totalRequested: res.data.totalRequested,
      totalCreated: res.data.totalCreated,
      created: res.data.created,
      failed: res.data.failed,
    };
  } catch (err) {
    const error = err as AxiosError<{
      message?: string;
      details?: { failed?: BookingFailure[]; totalRequested?: number; totalCreated?: number };
    }>;
    if (!error.response) {
      return { success: false, message: 'Network error. Please check your connection and try again.' };
    }
    const details = error.response.data?.details;
    if (details) {
      // 409 "no bookings were created" — still a well-formed per-item breakdown.
      return {
        success: true,
        totalRequested: details.totalRequested,
        totalCreated: details.totalCreated ?? 0,
        created: [],
        failed: details.failed ?? [],
      };
    }
    return { success: false, message: error.response.data?.message || 'Something went wrong. Please try again.' };
  }
}
