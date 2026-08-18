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

export interface VenueRatingResult {
  success: boolean;
  avgRating?: number;
  ratingCount?: number;
  message?: string;
}

const client: AxiosInstance = axios.create();

/** GET /reviews/venues/:venueId/rating — aggregate only, no individual review list. */
export async function getVenueRating(venueId: number): Promise<VenueRatingResult> {
  try {
    const token = await getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await client.get<{ avgRating: number; ratingCount: number }>(
      `${API_URL}/reviews/venues/${venueId}/rating`,
      { headers },
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
