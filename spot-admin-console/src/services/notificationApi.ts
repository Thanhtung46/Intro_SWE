import { apiClient } from './apiClient'

export type NotificationType =
  | 'OWNER_BOOKING_CREATED'
  | 'OWNER_BOOKING_CANCELLED'
  | 'OWNER_BOOKING_REMINDER'
  | 'SYSTEM'
  | string

export interface NotificationItem {
  notificationId: number
  type: NotificationType
  title: string
  body: string
  data: Record<string, unknown>
  isRead: boolean
  createdAt: string
}

export async function listNotifications(limit = 20) {
  const { data } = await apiClient.get<{ items: NotificationItem[] }>('/notifications', {
    params: { limit },
  })
  return data.items
}

export async function getUnreadCount() {
  const { data } = await apiClient.get<{ count: number }>('/notifications/unread-count')
  return data.count
}

export async function markNotificationRead(notificationId: number) {
  await apiClient.patch(`/notifications/${notificationId}/read`)
}

export async function markAllNotificationsRead() {
  await apiClient.post('/notifications/read-all')
}
