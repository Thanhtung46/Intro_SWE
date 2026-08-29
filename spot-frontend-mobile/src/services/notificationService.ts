import { AxiosError } from 'axios';
import apiClient from './apiClient';

export type NotificationType =
  | 'BOOKING_CREATED'
  | 'BOOKING_REMINDER'
  | 'SYSTEM'
  | 'GROUP_JOIN_REQUEST'
  | 'GROUP_APPROVED'
  | 'GROUP_REJECTED'
  | 'GROUP_KICKED'
  | 'GROUP_ADMIN_TRANSFERRED';

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

export async function getNotifications(limit = 20): Promise<NotificationListResult> {
  try {
    const res = await apiClient.get<{ items: NotificationItem[] }>('/notifications', {
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
    const res = await apiClient.get<{ count: number }>('/notifications/unread-count');
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
    await apiClient.patch(`/notifications/${id}/read`, {});
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
    await apiClient.post('/notifications/read-all', {});
    return { success: true };
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;
    if (!error.response) {
      return { success: false, message: 'Network error. Please check your connection and try again.' };
    }
    return { success: false, message: error.response.data?.message || 'Something went wrong. Please try again.' };
  }
}
