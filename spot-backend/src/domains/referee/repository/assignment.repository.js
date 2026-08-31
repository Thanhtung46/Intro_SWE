import {
  REFEREE_ASSIGNMENT_STATUSES,
  REFEREE_ASSIGNMENT_SOURCES,
} from '../../../shared/constants/referee.js';

export async function insertPendingAssignment(client, {
  bookingId,
  venueId,
  refereeId,
  feeVnd,
}) {
  const { rows } = await client.query(
    `INSERT INTO schema_referee.referee_assignments
       (booking_id, venue_id, referee_id, fee_vnd, status, source)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (booking_id, referee_id) DO NOTHING
     RETURNING assignment_id, booking_id, venue_id, referee_id, fee_vnd,
               status, source, accepted_at, completed_at, decline_reason, created_at`,
    [
      bookingId,
      venueId,
      refereeId,
      feeVnd,
      REFEREE_ASSIGNMENT_STATUSES.PENDING,
      REFEREE_ASSIGNMENT_SOURCES.HIRE_REFEREE,
    ],
  );
  return rows[0] ?? null;
}

export async function findByIdForReferee(client, assignmentId, refereeId) {
  const { rows } = await client.query(
    `SELECT a.assignment_id, a.booking_id, a.venue_id, a.referee_id,
            a.fee_vnd, a.status, a.source, a.accepted_at, a.completed_at,
            a.decline_reason, a.created_at,
            b.booking_date, lower(b.booking_time_range) AS starts_at,
            upper(b.booking_time_range) AS ends_at,
            v.name AS venue_name, v.address AS venue_address,
            f.sport_type,
            pp.full_name AS player_name,
            op.full_name AS owner_name
     FROM schema_referee.referee_assignments a
     JOIN schema_booking.bookings b ON b.booking_id = a.booking_id
     JOIN schema_venue.fields f ON f.field_id = b.field_id
     JOIN schema_venue.venues v ON v.venue_id = a.venue_id
     JOIN schema_auth.users pu ON pu.user_id = b.player_id
     LEFT JOIN schema_auth.user_profiles pp ON pp.user_id = pu.user_id
     JOIN schema_auth.users ou ON ou.user_id = v.owner_id
     LEFT JOIN schema_auth.user_profiles op ON op.user_id = ou.user_id
     WHERE a.assignment_id = $1 AND a.referee_id = $2`,
    [assignmentId, refereeId],
  );
  return rows[0] ?? null;
}

export async function listMatchInvitationsPending(client, refereeId) {
  const { rows } = await client.query(
    `SELECT a.assignment_id, a.booking_id, a.venue_id, a.referee_id,
            a.fee_vnd, a.status, a.created_at,
            lower(b.booking_time_range) AS starts_at,
            upper(b.booking_time_range) AS ends_at,
            v.name AS venue_name,
            f.sport_type,
            pp.full_name AS player_name
     FROM schema_referee.referee_assignments a
     JOIN schema_booking.bookings b ON b.booking_id = a.booking_id
     JOIN schema_venue.fields f ON f.field_id = b.field_id
     JOIN schema_venue.venues v ON v.venue_id = a.venue_id
     JOIN schema_auth.users pu ON pu.user_id = b.player_id
     LEFT JOIN schema_auth.user_profiles pp ON pp.user_id = pu.user_id
     WHERE a.referee_id = $1 AND a.status = $2
     ORDER BY lower(b.booking_time_range) ASC`,
    [refereeId, REFEREE_ASSIGNMENT_STATUSES.PENDING],
  );
  return rows;
}

export async function listConfirmed(client, refereeId) {
  const { rows } = await client.query(
    `SELECT a.assignment_id, a.booking_id, a.venue_id, a.referee_id,
            a.fee_vnd, a.status, a.accepted_at, a.created_at,
            lower(b.booking_time_range) AS starts_at,
            upper(b.booking_time_range) AS ends_at,
            v.name AS venue_name,
            f.sport_type,
            pp.full_name AS player_name
     FROM schema_referee.referee_assignments a
     JOIN schema_booking.bookings b ON b.booking_id = a.booking_id
     JOIN schema_venue.fields f ON f.field_id = b.field_id
     JOIN schema_venue.venues v ON v.venue_id = a.venue_id
     JOIN schema_auth.users pu ON pu.user_id = b.player_id
     LEFT JOIN schema_auth.user_profiles pp ON pp.user_id = pu.user_id
     WHERE a.referee_id = $1
       AND a.status = $2
       AND lower(b.booking_time_range) > CURRENT_TIMESTAMP
     ORDER BY lower(b.booking_time_range) ASC`,
    [refereeId, REFEREE_ASSIGNMENT_STATUSES.ACCEPTED],
  );
  return rows;
}

export async function listCompleted(client, refereeId, { sinceDate, filter }) {
  const params = [refereeId];
  let filterClause = '';

  params.push(sinceDate);
  const sinceIdx = params.length;

  if (filter === 'completed') {
    filterClause = ` AND (
      a.status = 'COMPLETED'
      OR (a.status = 'ACCEPTED' AND upper(b.booking_time_range) <= CURRENT_TIMESTAMP)
    ) AND a.status <> 'DECLINED'`;
  } else if (filter === 'declined') {
    filterClause = ` AND a.status = 'DECLINED'`;
  } else {
    filterClause = ` AND (
      a.status IN ('COMPLETED', 'DECLINED')
      OR (a.status = 'ACCEPTED' AND upper(b.booking_time_range) <= CURRENT_TIMESTAMP)
    )`;
  }

  const { rows } = await client.query(
    `SELECT a.assignment_id, a.booking_id, a.venue_id, a.referee_id,
            a.fee_vnd, a.status, a.accepted_at, a.completed_at, a.decline_reason,
            a.created_at,
            lower(b.booking_time_range) AS starts_at,
            upper(b.booking_time_range) AS ends_at,
            v.name AS venue_name,
            f.sport_type,
            pp.full_name AS player_name
     FROM schema_referee.referee_assignments a
     JOIN schema_booking.bookings b ON b.booking_id = a.booking_id
     JOIN schema_venue.fields f ON f.field_id = b.field_id
     JOIN schema_venue.venues v ON v.venue_id = a.venue_id
     JOIN schema_auth.users pu ON pu.user_id = b.player_id
     LEFT JOIN schema_auth.user_profiles pp ON pp.user_id = pu.user_id
     WHERE a.referee_id = $1
       AND GREATEST(
         COALESCE(a.completed_at, a.accepted_at, a.created_at),
         upper(b.booking_time_range)
       )::date >= $${sinceIdx}::date
       ${filterClause}
     ORDER BY lower(b.booking_time_range) DESC`,
    params,
  );
  return rows;
}

export async function listScheduleForMonth(client, refereeId, monthStart, monthEnd) {
  const { rows } = await client.query(
    `SELECT a.assignment_id, a.booking_id, a.venue_id, a.fee_vnd, a.status,
            a.accepted_at,
            lower(b.booking_time_range) AS starts_at,
            upper(b.booking_time_range) AS ends_at,
            b.booking_date,
            v.name AS venue_name,
            f.sport_type,
            pp.full_name AS player_name
     FROM schema_referee.referee_assignments a
     JOIN schema_booking.bookings b ON b.booking_id = a.booking_id
     JOIN schema_venue.fields f ON f.field_id = b.field_id
     JOIN schema_venue.venues v ON v.venue_id = a.venue_id
     JOIN schema_auth.users pu ON pu.user_id = b.player_id
     LEFT JOIN schema_auth.user_profiles pp ON pp.user_id = pu.user_id
     WHERE a.referee_id = $1
       AND a.status = $2
       AND b.booking_date >= $3::date
       AND b.booking_date < $4::date
     ORDER BY lower(b.booking_time_range) ASC`,
    [refereeId, REFEREE_ASSIGNMENT_STATUSES.ACCEPTED, monthStart, monthEnd],
  );
  return rows;
}

export async function syncPastAcceptedToCompleted(client, refereeId) {
  const { rows } = await client.query(
    `UPDATE schema_referee.referee_assignments a
     SET status = $2,
         completed_at = CURRENT_TIMESTAMP
     FROM schema_booking.bookings b
     WHERE a.booking_id = b.booking_id
       AND a.referee_id = $1
       AND a.status = $3
       AND upper(b.booking_time_range) <= CURRENT_TIMESTAMP
     RETURNING a.assignment_id, a.referee_id`,
    [refereeId, REFEREE_ASSIGNMENT_STATUSES.COMPLETED, REFEREE_ASSIGNMENT_STATUSES.ACCEPTED],
  );

  if (rows.length > 0) {
    await client.query(
      `UPDATE schema_referee.referee_profiles
       SET total_matches_officiated = total_matches_officiated + $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [refereeId, rows.length],
    );
  }

  return rows.length;
}

export async function cancelPendingForRefereeAtVenue(client, refereeId, venueId) {
  const { rowCount } = await client.query(
    `UPDATE schema_referee.referee_assignments
     SET status = $4
     WHERE referee_id = $1 AND venue_id = $2 AND status = $3`,
    [
      refereeId,
      venueId,
      REFEREE_ASSIGNMENT_STATUSES.PENDING,
      REFEREE_ASSIGNMENT_STATUSES.CANCELLED,
    ],
  );
  return rowCount;
}

export async function acceptAssignment(client, assignmentId, refereeId) {
  const { rows: locked } = await client.query(
    `SELECT assignment_id, booking_id, status
     FROM schema_referee.referee_assignments
     WHERE assignment_id = $1 AND referee_id = $2
     FOR UPDATE`,
    [assignmentId, refereeId],
  );
  const row = locked[0];
  if (!row) return { error: 'NOT_FOUND' };
  if (row.status !== REFEREE_ASSIGNMENT_STATUSES.PENDING) {
    return { error: 'INVALID_STATUS', status: row.status };
  }

  const { rows: bookingLock } = await client.query(
    `SELECT booking_id FROM schema_referee.referee_assignments
     WHERE booking_id = $1 AND status = $2
     FOR UPDATE`,
    [row.booking_id, REFEREE_ASSIGNMENT_STATUSES.ACCEPTED],
  );
  if (bookingLock.length > 0) {
    return { error: 'ALREADY_TAKEN' };
  }

  const { rows: updated } = await client.query(
    `UPDATE schema_referee.referee_assignments
     SET status = $3, accepted_at = CURRENT_TIMESTAMP
     WHERE assignment_id = $1 AND referee_id = $2 AND status = $4
     RETURNING assignment_id, booking_id, venue_id, referee_id, fee_vnd,
               status, source, accepted_at, completed_at, decline_reason, created_at`,
    [
      assignmentId,
      refereeId,
      REFEREE_ASSIGNMENT_STATUSES.ACCEPTED,
      REFEREE_ASSIGNMENT_STATUSES.PENDING,
    ],
  );

  await client.query(
    `UPDATE schema_referee.referee_assignments
     SET status = $3
     WHERE booking_id = $1 AND assignment_id <> $2 AND status = $4`,
    [
      row.booking_id,
      assignmentId,
      REFEREE_ASSIGNMENT_STATUSES.CANCELLED,
      REFEREE_ASSIGNMENT_STATUSES.PENDING,
    ],
  );

  return { assignment: updated[0] };
}

export async function declineAssignment(client, assignmentId, refereeId, reason) {
  const { rows } = await client.query(
    `UPDATE schema_referee.referee_assignments
     SET status = $4, decline_reason = $5
     WHERE assignment_id = $1 AND referee_id = $2 AND status = $3
     RETURNING assignment_id, booking_id, venue_id, referee_id, fee_vnd,
               status, source, accepted_at, completed_at, decline_reason, created_at`,
    [
      assignmentId,
      refereeId,
      REFEREE_ASSIGNMENT_STATUSES.PENDING,
      REFEREE_ASSIGNMENT_STATUSES.DECLINED,
      reason ?? null,
    ],
  );
  return rows[0] ?? null;
}

export async function sumEarningsForMonth(client, refereeId, monthStart, monthEnd) {
  const { rows } = await client.query(
    `SELECT
       COALESCE(SUM(a.fee_vnd), 0)::numeric AS total_fee,
       COUNT(*)::int AS match_count
     FROM schema_referee.referee_assignments a
     WHERE a.referee_id = $1
       AND a.status = $2
       AND a.completed_at >= $3::timestamptz
       AND a.completed_at < $4::timestamptz`,
    [
      refereeId,
      REFEREE_ASSIGNMENT_STATUSES.COMPLETED,
      monthStart,
      monthEnd,
    ],
  );
  return rows[0];
}

export async function earningsChartPoints(client, refereeId, monthStart, monthEnd) {
  const { rows } = await client.query(
    `SELECT
       date_trunc('day', a.completed_at AT TIME ZONE 'Asia/Bangkok')::date AS day,
       COALESCE(SUM(a.fee_vnd), 0)::numeric AS amount
     FROM schema_referee.referee_assignments a
     WHERE a.referee_id = $1
       AND a.status = $2
       AND a.completed_at >= $3::timestamptz
       AND a.completed_at < $4::timestamptz
     GROUP BY 1
     ORDER BY 1 ASC`,
    [
      refereeId,
      REFEREE_ASSIGNMENT_STATUSES.COMPLETED,
      monthStart,
      monthEnd,
    ],
  );
  return rows;
}

export async function listEarningsHistory(client, refereeId, { limit, offset }) {
  const { rows } = await client.query(
    `SELECT a.assignment_id, a.booking_id, a.fee_vnd, a.completed_at,
            v.name AS venue_name,
            f.sport_type,
            pp.full_name AS player_name,
            lower(b.booking_time_range) AS starts_at
     FROM schema_referee.referee_assignments a
     JOIN schema_booking.bookings b ON b.booking_id = a.booking_id
     JOIN schema_venue.fields f ON f.field_id = b.field_id
     JOIN schema_venue.venues v ON v.venue_id = a.venue_id
     JOIN schema_auth.users pu ON pu.user_id = b.player_id
     LEFT JOIN schema_auth.user_profiles pp ON pp.user_id = pu.user_id
     WHERE a.referee_id = $1 AND a.status = $2
     ORDER BY a.completed_at DESC NULLS LAST
     LIMIT $3 OFFSET $4`,
    [refereeId, REFEREE_ASSIGNMENT_STATUSES.COMPLETED, limit, offset],
  );

  const { rows: countRows } = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM schema_referee.referee_assignments
     WHERE referee_id = $1 AND status = $2`,
    [refereeId, REFEREE_ASSIGNMENT_STATUSES.COMPLETED],
  );

  return { rows, total: countRows[0]?.total ?? 0 };
}
