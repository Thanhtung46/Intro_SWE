import {
  JOIN_REQUEST_STATUSES,
  PAYMENT_STATUSES,
} from '../../../shared/constants/matchmaking.js';

const REQUEST_SELECT = `
  r.request_id, r.match_id, r.user_id, r.message, r.status,
  r.skill_warning, r.heads, r.share_amount, r.payment_status,
  r.contact_phone, r.created_at, r.updated_at,
  p.full_name, p.gender, p.avatar_url, u.phone_number
`;

const REQUEST_FROM = `
  FROM schema_matchmaking.match_join_requests r
  LEFT JOIN schema_auth.user_profiles p ON p.user_id = r.user_id
  LEFT JOIN schema_auth.users u ON u.user_id = r.user_id
`;

export async function insert(client, input) {
  const { rows } = await client.query(
    `INSERT INTO schema_matchmaking.match_join_requests (
       match_id, user_id, message, status, skill_warning,
       heads, share_amount, payment_status, contact_phone
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING request_id, match_id, user_id, message, status,
               skill_warning, heads, share_amount, payment_status,
               contact_phone, created_at, updated_at`,
    [
      input.matchId,
      input.userId,
      input.message ?? null,
      input.status,
      Boolean(input.skillWarning),
      input.heads,
      input.shareAmount ?? null,
      input.paymentStatus ?? null,
      input.contactPhone ?? null,
    ],
  );
  return rows[0];
}

export async function insertGuests(client, requestId, guests = []) {
  const inserted = [];
  for (let index = 0; index < guests.length; index += 1) {
    const guest = guests[index];
    const { rows } = await client.query(
      `INSERT INTO schema_matchmaking.match_guests (
         request_id, name, skill, gender, phone, sort_order
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING guest_id, request_id, name, skill, gender, phone, sort_order`,
      [
        requestId,
        guest.name,
        guest.skill,
        guest.gender,
        guest.phoneNumber ?? guest.phone ?? null,
        index,
      ],
    );
    inserted.push(rows[0]);
  }
  return inserted;
}

export async function findActiveByMatchUser(client, matchId, userId) {
  const { rows } = await client.query(
    `SELECT ${REQUEST_SELECT}
     ${REQUEST_FROM}
     WHERE r.match_id = $1
       AND r.user_id = $2
       AND r.status = ANY($3::text[])
     LIMIT 1`,
    [
      matchId,
      userId,
      [JOIN_REQUEST_STATUSES.PENDING, JOIN_REQUEST_STATUSES.ACCEPTED],
    ],
  );
  return rows[0] || null;
}

export async function findAcceptedByMatchUser(client, matchId, userId) {
  const { rows } = await client.query(
    `SELECT ${REQUEST_SELECT}
     ${REQUEST_FROM}
     WHERE r.match_id = $1
       AND r.user_id = $2
       AND r.status = $3
     LIMIT 1
     FOR UPDATE OF r`,
    [matchId, userId, JOIN_REQUEST_STATUSES.ACCEPTED],
  );
  return rows[0] || null;
}

export async function findByIdForUpdate(client, requestId) {
  const { rows } = await client.query(
    `SELECT ${REQUEST_SELECT}
     ${REQUEST_FROM}
     WHERE r.request_id = $1
     LIMIT 1
     FOR UPDATE OF r`,
    [requestId],
  );
  return rows[0] || null;
}

export async function listByMatch(client, matchId) {
  const { rows } = await client.query(
    `SELECT ${REQUEST_SELECT}
     ${REQUEST_FROM}
     WHERE r.match_id = $1
       AND r.status = $2
     ORDER BY r.created_at ASC, r.request_id ASC`,
    [matchId, JOIN_REQUEST_STATUSES.PENDING],
  );
  return rows;
}

export async function listAcceptedByMatch(client, matchId) {
  const { rows } = await client.query(
    `SELECT ${REQUEST_SELECT}
     ${REQUEST_FROM}
     WHERE r.match_id = $1
       AND r.status = $2
     ORDER BY r.created_at ASC, r.request_id ASC`,
    [matchId, JOIN_REQUEST_STATUSES.ACCEPTED],
  );
  return rows;
}

export async function findGuestsByRequestIds(client, requestIds) {
  if (!requestIds.length) {
    return [];
  }
  const { rows } = await client.query(
    `SELECT guest_id, request_id, name, skill, gender, phone, sort_order
     FROM schema_matchmaking.match_guests
     WHERE request_id = ANY($1::int[])
     ORDER BY request_id ASC, sort_order ASC, guest_id ASC`,
    [requestIds],
  );
  return rows;
}

export async function updateDecision(client, requestId, {
  status,
  shareAmount = null,
  paymentStatus = null,
}) {
  const { rows } = await client.query(
    `UPDATE schema_matchmaking.match_join_requests
     SET status = $2,
         share_amount = $3,
         payment_status = $4,
         updated_at = CURRENT_TIMESTAMP
     WHERE request_id = $1
     RETURNING request_id, match_id, user_id, message, status,
               skill_warning, heads, share_amount, payment_status,
               contact_phone, created_at, updated_at`,
    [requestId, status, shareAmount, paymentStatus],
  );
  return rows[0] || null;
}

export async function findLatestByMatchUser(
  client,
  matchId,
  userId,
  { forUpdate = false } = {},
) {
  const { rows } = await client.query(
    `SELECT ${REQUEST_SELECT}
     ${REQUEST_FROM}
     WHERE r.match_id = $1
       AND r.user_id = $2
     ORDER BY r.request_id DESC
     LIMIT 1
     ${forUpdate ? 'FOR UPDATE OF r' : ''}`,
    [matchId, userId],
  );
  return rows[0] || null;
}

export async function deleteGuestsByRequestId(client, requestId) {
  await client.query(
    `DELETE FROM schema_matchmaking.match_guests WHERE request_id = $1`,
    [requestId],
  );
}

export async function resetRequest(client, requestId, input) {
  const { rows } = await client.query(
    `UPDATE schema_matchmaking.match_join_requests
     SET message = $2,
         status = $3,
         skill_warning = $4,
         heads = $5,
         share_amount = $6,
         payment_status = $7,
         contact_phone = $8,
         updated_at = CURRENT_TIMESTAMP
     WHERE request_id = $1
     RETURNING request_id, match_id, user_id, message, status,
               skill_warning, heads, share_amount, payment_status,
               contact_phone, created_at, updated_at`,
    [
      requestId,
      input.message ?? null,
      input.status,
      Boolean(input.skillWarning),
      input.heads,
      input.shareAmount ?? null,
      input.paymentStatus ?? null,
      input.contactPhone ?? null,
    ],
  );
  return rows[0];
}

export async function rejectPendingByMatchId(client, matchId) {
  const { rowCount } = await client.query(
    `UPDATE schema_matchmaking.match_join_requests
     SET status = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE match_id = $1
       AND status = $3`,
    [matchId, JOIN_REQUEST_STATUSES.REJECTED, JOIN_REQUEST_STATUSES.PENDING],
  );
  return rowCount;
}

/** Manage Matches — Join Requests tab (joiner tracking; PENDING + REJECTED). */
export async function listMyJoinRequests(client, { userId, limit, offset }) {
  const { rows } = await client.query(
    `SELECT ${REQUEST_SELECT},
            m.title AS match_title,
            m.starts_at AS match_starts_at,
            m.ends_at AS match_ends_at,
            m.venue_name AS match_venue_name,
            m.venue_address AS match_venue_address,
            m.status AS match_status,
            m.sport AS match_sport,
            m.join_mode AS match_join_mode,
            hp.full_name AS host_full_name
     ${REQUEST_FROM}
     INNER JOIN schema_matchmaking.matches m ON m.match_id = r.match_id
     LEFT JOIN schema_auth.user_profiles hp ON hp.user_id = m.host_user_id
     WHERE r.user_id = $1
       AND r.status = ANY($2::text[])
     ORDER BY
       CASE r.status WHEN '${JOIN_REQUEST_STATUSES.PENDING}' THEN 0 ELSE 1 END,
       r.updated_at DESC,
       r.request_id DESC
     LIMIT $3 OFFSET $4`,
    [
      userId,
      [JOIN_REQUEST_STATUSES.PENDING, JOIN_REQUEST_STATUSES.REJECTED],
      limit,
      offset,
    ],
  );
  return rows;
}

export async function countMyJoinRequests(client, { userId }) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM schema_matchmaking.match_join_requests r
     WHERE r.user_id = $1
       AND r.status = ANY($2::text[])`,
    [
      userId,
      [JOIN_REQUEST_STATUSES.PENDING, JOIN_REQUEST_STATUSES.REJECTED],
    ],
  );
  return rows[0]?.total ?? 0;
}
