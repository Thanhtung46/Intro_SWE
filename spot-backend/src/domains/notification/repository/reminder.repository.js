export async function createReminderJob(client, {
  userId,
  bookingId = null,
  offsetHours,
  fireAt,
}) {
  const { rows } = await client.query(
    `INSERT INTO schema_notification.reminder_jobs
      (user_id, booking_id, offset_hours, fire_at, status)
     VALUES ($1, $2, $3, $4, 'PENDING')
     RETURNING reminder_id, user_id, booking_id, offset_hours, fire_at,
               status, notification_id, created_at, updated_at`,
    [userId, bookingId, offsetHours, fireAt],
  );
  return rows[0];
}

export async function findDuePending(client, { limit = 50 } = {}) {
  const { rows } = await client.query(
    `SELECT reminder_id, user_id, booking_id, offset_hours, fire_at,
            status, notification_id, created_at, updated_at
     FROM schema_notification.reminder_jobs
     WHERE status = 'PENDING' AND fire_at <= NOW()
     ORDER BY fire_at ASC
     LIMIT $1`,
    [limit],
  );
  return rows;
}

export async function findById(client, reminderId) {
  const { rows } = await client.query(
    `SELECT reminder_id, user_id, booking_id, offset_hours, fire_at,
            status, notification_id, created_at, updated_at
     FROM schema_notification.reminder_jobs
     WHERE reminder_id = $1
     LIMIT 1`,
    [reminderId],
  );
  return rows[0] || null;
}

export async function markSent(client, reminderId, notificationId) {
  const { rows } = await client.query(
    `UPDATE schema_notification.reminder_jobs
     SET status = 'SENT',
         notification_id = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE reminder_id = $1 AND status = 'PENDING'
     RETURNING reminder_id, status, notification_id`,
    [reminderId, notificationId],
  );
  return rows[0] || null;
}

export async function markFailed(client, reminderId) {
  const { rows } = await client.query(
    `UPDATE schema_notification.reminder_jobs
     SET status = 'FAILED',
         updated_at = CURRENT_TIMESTAMP
     WHERE reminder_id = $1 AND status = 'PENDING'
     RETURNING reminder_id, status`,
    [reminderId],
  );
  return rows[0] || null;
}

export async function cancelForBooking(client, bookingId) {
  const { rowCount } = await client.query(
    `UPDATE schema_notification.reminder_jobs
     SET status = 'CANCELLED',
         updated_at = CURRENT_TIMESTAMP
     WHERE booking_id = $1 AND status = 'PENDING'`,
    [bookingId],
  );
  return rowCount;
}

export async function findPendingIdsForBooking(client, bookingId) {
  const { rows } = await client.query(
    `SELECT reminder_id
     FROM schema_notification.reminder_jobs
     WHERE booking_id = $1 AND status = 'PENDING'`,
    [bookingId],
  );
  return rows.map((r) => r.reminder_id);
}
