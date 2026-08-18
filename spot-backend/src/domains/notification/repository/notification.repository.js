export async function createNotification(client, {
  userId,
  type,
  title,
  body,
  data = {},
  channel = 'IN_APP',
}) {
  const { rows } = await client.query(
    `INSERT INTO schema_notification.notifications
      (user_id, type, title, body, data, channel)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6)
     RETURNING notification_id, user_id, type, title, body, data, channel,
               is_read, read_at, created_at`,
    [userId, type, title, body, JSON.stringify(data), channel],
  );
  return rows[0];
}

export async function listByUser(client, userId, {
  limit = 20,
  beforeId = null,
  unreadOnly = false,
}) {
  const values = [userId, limit];
  const filters = ['user_id = $1'];

  if (unreadOnly) {
    filters.push('is_read = FALSE');
  }
  if (beforeId != null) {
    values.push(beforeId);
    filters.push(`notification_id < $${values.length}`);
  }

  const { rows } = await client.query(
    `SELECT notification_id, user_id, type, title, body, data, channel,
            is_read, read_at, created_at
     FROM schema_notification.notifications
     WHERE ${filters.join(' AND ')}
     ORDER BY notification_id DESC
     LIMIT $2`,
    values,
  );
  return rows;
}

export async function countUnread(client, userId) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS count
     FROM schema_notification.notifications
     WHERE user_id = $1 AND is_read = FALSE`,
    [userId],
  );
  return rows[0]?.count ?? 0;
}

export async function findByIdForUser(client, notificationId, userId) {
  const { rows } = await client.query(
    `SELECT notification_id, user_id, type, title, body, data, channel,
            is_read, read_at, created_at
     FROM schema_notification.notifications
     WHERE notification_id = $1 AND user_id = $2
     LIMIT 1`,
    [notificationId, userId],
  );
  return rows[0] || null;
}

export async function markRead(client, notificationId, userId) {
  const { rows } = await client.query(
    `UPDATE schema_notification.notifications
     SET is_read = TRUE,
         read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     WHERE notification_id = $1 AND user_id = $2
     RETURNING notification_id, user_id, type, title, body, data, channel,
               is_read, read_at, created_at`,
    [notificationId, userId],
  );
  return rows[0] || null;
}

export async function markAllRead(client, userId) {
  const { rowCount } = await client.query(
    `UPDATE schema_notification.notifications
     SET is_read = TRUE,
         read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     WHERE user_id = $1 AND is_read = FALSE`,
    [userId],
  );
  return rowCount;
}
