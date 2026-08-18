export function toPublicNotification(row) {
  if (!row) return null;
  return {
    notificationId: row.notification_id,
    type: row.type,
    title: row.title,
    body: row.body,
    data: row.data || {},
    channel: row.channel,
    isRead: Boolean(row.is_read),
    readAt: row.read_at ?? null,
    createdAt: row.created_at,
  };
}
