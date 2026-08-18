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

export interface VenueRatingResult {
  success: boolean;
  avgRating?: number;
  ratingCount?: number;
  message?: string;
}

/** GET /reviews/venues/:venueId/rating — aggregate only, no individual review list. */
export async function getVenueRating(venueId: number): Promise<VenueRatingResult> {
  try {
    const res = await apiClient.get<{ avgRating: number; ratingCount: number }>(
      `/reviews/venues/${venueId}/rating`,
    );
    return { success: true, avgRating: res.data.avgRating, ratingCount: res.data.ratingCount };
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;
    if (!error.response) {
      return { success: false, message: 'Network error. Please check your connection and try again.' };
    }
    return { success: false, message: error.response.data?.message || 'Something went wrong. Please try again.' };
  }
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
