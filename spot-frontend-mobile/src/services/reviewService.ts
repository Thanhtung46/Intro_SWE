import { AxiosError } from 'axios';
import apiClient from './apiClient';

export interface CreateReviewPayload {
  bookingId: number;
  rating: number;
  reviewText?: string;
}

export interface ReviewResult {
  success: boolean;
  message?: string;
}

export async function createReview(payload: CreateReviewPayload): Promise<ReviewResult> {
  try {
    await apiClient.post('/reviews', payload);
    return { success: true };
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;
    if (!error.response) {
      return { success: false, message: 'Network error. Please check your connection and try again.' };
    }
    return { success: false, message: error.response.data?.message || 'Something went wrong. Please try again.' };
  }
}
