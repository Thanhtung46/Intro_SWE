export async function upsertPendingJob(client, {
  assignmentId,
  playerId,
  refereeId,
  bookingId,
  fireAt,
}) {
  const { rows } = await client.query(
    `INSERT INTO schema_notification.referee_rating_jobs
       (assignment_id, player_id, referee_id, booking_id, fire_at, status)
     VALUES ($1, $2, $3, $4, $5, 'PENDING')
     ON CONFLICT (assignment_id) DO UPDATE
       SET fire_at = EXCLUDED.fire_at,
           updated_at = CURRENT_TIMESTAMP
     WHERE schema_notification.referee_rating_jobs.status = 'PENDING'
     RETURNING job_id, assignment_id, player_id, referee_id, booking_id,
               fire_at, status, notification_id, created_at, updated_at`,
    [assignmentId, playerId, refereeId, bookingId, fireAt],
  );
  return rows[0] ?? null;
}

export async function findDuePending(client, { limit = 50 } = {}) {
  const { rows } = await client.query(
    `SELECT job_id, assignment_id, player_id, referee_id, booking_id,
            fire_at, status, notification_id, created_at, updated_at
     FROM schema_notification.referee_rating_jobs
     WHERE status = 'PENDING' AND fire_at <= NOW()
     ORDER BY fire_at ASC
     LIMIT $1`,
    [limit],
  );
  return rows;
}

export async function findById(client, jobId) {
  const { rows } = await client.query(
    `SELECT job_id, assignment_id, player_id, referee_id, booking_id,
            fire_at, status, notification_id, created_at, updated_at
     FROM schema_notification.referee_rating_jobs
     WHERE job_id = $1
     LIMIT 1`,
    [jobId],
  );
  return rows[0] ?? null;
}

export async function markSent(client, jobId, notificationId) {
  const { rows } = await client.query(
    `UPDATE schema_notification.referee_rating_jobs
     SET status = 'SENT',
         notification_id = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE job_id = $1 AND status = 'PENDING'
     RETURNING job_id, status, notification_id`,
    [jobId, notificationId],
  );
  return rows[0] ?? null;
}

export async function markSkipped(client, jobId) {
  const { rows } = await client.query(
    `UPDATE schema_notification.referee_rating_jobs
     SET status = 'SKIPPED',
         updated_at = CURRENT_TIMESTAMP
     WHERE job_id = $1 AND status = 'PENDING'
     RETURNING job_id, status`,
    [jobId],
  );
  return rows[0] ?? null;
}

export async function markFailed(client, jobId) {
  const { rows } = await client.query(
    `UPDATE schema_notification.referee_rating_jobs
     SET status = 'FAILED',
         updated_at = CURRENT_TIMESTAMP
     WHERE job_id = $1 AND status = 'PENDING'
     RETURNING job_id, status`,
    [jobId],
  );
  return rows[0] ?? null;
}

export async function findPendingByAssignmentId(client, assignmentId) {
  const { rows } = await client.query(
    `SELECT job_id, assignment_id, player_id, referee_id, booking_id,
            fire_at, status, notification_id, created_at, updated_at
     FROM schema_notification.referee_rating_jobs
     WHERE assignment_id = $1 AND status = 'PENDING'
     LIMIT 1`,
    [assignmentId],
  );
  return rows[0] ?? null;
}

export async function cancelForBooking(client, bookingId) {
  const { rowCount } = await client.query(
    `UPDATE schema_notification.referee_rating_jobs
     SET status = 'CANCELLED',
         updated_at = CURRENT_TIMESTAMP
     WHERE booking_id = $1 AND status = 'PENDING'`,
    [bookingId],
  );
  return rowCount;
}
