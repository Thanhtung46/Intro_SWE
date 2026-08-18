import axios, { AxiosError, AxiosInstance } from 'axios';
import { API_URL } from '../config/env';
import { getToken } from '../utils/authStorage';

export type NotificationType = 'BOOKING_CREATED' | 'BOOKING_REMINDER' | 'SYSTEM';

export interface NotificationItem {
  notificationId: number;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  channel: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResult {
  success: boolean;
  items?: NotificationItem[];
  message?: string;
}

export interface UnreadCountResult {
  success: boolean;
  count?: number;
  message?: string;
}

export interface NotificationActionResult {
  success: boolean;
  message?: string;
}

const client: AxiosInstance = axios.create();

export async function getNotifications(limit = 20): Promise<NotificationListResult> {
  try {
    const token = await getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await client.get<{ items: NotificationItem[] }>(`${API_URL}/notifications`, {
      headers,
      params: { limit },
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

export async function getUnreadCount(): Promise<UnreadCountResult> {
  try {
    const token = await getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await client.get<{ count: number }>(`${API_URL}/notifications/unread-count`, { headers });
    return { success: true, count: res.data.count };
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;
    if (!error.response) {
      return { success: false, message: 'Network error. Please check your connection and try again.' };
    }
    return { success: false, message: error.response.data?.message || 'Something went wrong. Please try again.' };
  }
}

export async function markNotificationRead(id: number): Promise<NotificationActionResult> {
  try {
    const token = await getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    await client.patch(`${API_URL}/notifications/${id}/read`, {}, { headers });
    return { success: true };
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;
    if (!error.response) {
      return { success: false, message: 'Network error. Please check your connection and try again.' };
    }
    return { success: false, message: error.response.data?.message || 'Something went wrong. Please try again.' };
  }
}

export async function markAllNotificationsRead(): Promise<NotificationActionResult> {
  try {
    const token = await getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    await client.post(`${API_URL}/notifications/read-all`, {}, { headers });
    return { success: true };
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;
    if (!error.response) {
      return { success: false, message: 'Network error. Please check your connection and try again.' };
    }
    return { success: false, message: error.response.data?.message || 'Something went wrong. Please try again.' };
  }
}
