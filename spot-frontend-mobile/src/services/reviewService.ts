import axios, { AxiosError, AxiosInstance } from 'axios';
import { API_URL } from '../config/env';
import { getToken } from '../utils/authStorage';

export interface CreateReviewPayload {
  bookingId: number;
  rating: number;
  reviewText?: string;
}

export interface ReviewResult {
  success: boolean;
  message?: string;
}

const client: AxiosInstance = axios.create();

export async function createReview(payload: CreateReviewPayload): Promise<ReviewResult> {
  try {
    const token = await getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    await client.post(`${API_URL}/reviews`, payload, { headers });
    return { success: true };
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;
    if (!error.response) {
      return { success: false, message: 'Network error. Please check your connection and try again.' };
    }
    return { success: false, message: error.response.data?.message || 'Something went wrong. Please try again.' };
  }
}
