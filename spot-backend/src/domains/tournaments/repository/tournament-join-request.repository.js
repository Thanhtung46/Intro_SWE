import { TOURNAMENT_JOIN_REQUEST_STATUSES } from '../../../shared/constants/tournaments.js';

const REQUEST_SELECT = `
  r.request_id, r.tournament_id, r.captain_user_id, r.team_name, r.team_logo_url,
  r.roster_json, r.status, r.created_at, r.updated_at,
  cp.full_name AS captain_full_name,
  cp.avatar_url AS captain_avatar_url,
  u.phone_number AS captain_phone_number
`;

const REQUEST_FROM = `
  FROM schema_tournaments.tournament_join_requests r
  LEFT JOIN schema_auth.user_profiles cp ON cp.user_id = r.captain_user_id
  LEFT JOIN schema_auth.users u ON u.user_id = r.captain_user_id
`;

export async function insert(client, input) {
  const { rows } = await client.query(
    `INSERT INTO schema_tournaments.tournament_join_requests (
       tournament_id, captain_user_id, team_name, team_logo_url, roster_json, status
     ) VALUES ($1, $2, $3, $4, $5::jsonb, $6)
     RETURNING request_id, tournament_id, captain_user_id, team_name, team_logo_url,
               roster_json, status, created_at, updated_at`,
    [
      input.tournamentId,
      input.captainUserId,
      input.teamName,
      input.teamLogoUrl,
      JSON.stringify(input.roster),
      input.status,
    ],
  );
  return rows[0];
}

export async function resetRequest(client, requestId, input) {
  const { rows } = await client.query(
    `UPDATE schema_tournaments.tournament_join_requests
     SET team_name = $2,
         team_logo_url = $3,
         roster_json = $4::jsonb,
         status = $5,
         updated_at = CURRENT_TIMESTAMP
     WHERE request_id = $1
     RETURNING request_id, tournament_id, captain_user_id, team_name, team_logo_url,
               roster_json, status, created_at, updated_at`,
    [
      requestId,
      input.teamName,
      input.teamLogoUrl,
      JSON.stringify(input.roster),
      input.status,
    ],
  );
  return rows[0] || null;
}

export async function findLatestByTournamentCaptain(
  client,
  tournamentId,
  captainUserId,
  { forUpdate = false } = {},
) {
  const { rows } = await client.query(
    `SELECT ${REQUEST_SELECT}
     ${REQUEST_FROM}
     WHERE r.tournament_id = $1
       AND r.captain_user_id = $2
     ORDER BY r.request_id DESC
     LIMIT 1
     ${forUpdate ? 'FOR UPDATE OF r' : ''}`,
    [tournamentId, captainUserId],
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

export async function updateStatus(client, requestId, status) {
  const { rows } = await client.query(
    `UPDATE schema_tournaments.tournament_join_requests
     SET status = $2, updated_at = CURRENT_TIMESTAMP
     WHERE request_id = $1
     RETURNING request_id, tournament_id, captain_user_id, team_name, team_logo_url,
               roster_json, status, created_at, updated_at`,
    [requestId, status],
  );
  return rows[0] || null;
}

export async function deleteById(client, requestId) {
  await client.query(
    `DELETE FROM schema_tournaments.tournament_join_requests WHERE request_id = $1`,
    [requestId],
  );
}

export async function listPendingByTournament(client, tournamentId) {
  const { rows } = await client.query(
    `SELECT ${REQUEST_SELECT}
     ${REQUEST_FROM}
     WHERE r.tournament_id = $1
       AND r.status = $2
     ORDER BY r.created_at ASC, r.request_id ASC`,
    [tournamentId, TOURNAMENT_JOIN_REQUEST_STATUSES.PENDING],
  );
  return rows;
}

function myJoinRequestStatuses(status) {
  if (status === TOURNAMENT_JOIN_REQUEST_STATUSES.PENDING) {
    return [TOURNAMENT_JOIN_REQUEST_STATUSES.PENDING];
  }
  if (status === TOURNAMENT_JOIN_REQUEST_STATUSES.REJECTED) {
    return [TOURNAMENT_JOIN_REQUEST_STATUSES.REJECTED];
  }
  return [
    TOURNAMENT_JOIN_REQUEST_STATUSES.PENDING,
    TOURNAMENT_JOIN_REQUEST_STATUSES.REJECTED,
  ];
}

export async function listMyJoinRequests(client, { userId, limit, offset, status }) {
  const statuses = myJoinRequestStatuses(status);
  const { rows } = await client.query(
    `SELECT ${REQUEST_SELECT},
            t.title AS tournament_title,
            t.sport AS tournament_sport,
            t.format AS tournament_format,
            t.gender_division AS tournament_gender_division,
            t.status AS tournament_status,
            t.venue_name AS tournament_venue_name,
            t.venue_address AS tournament_venue_address,
            t.cover_url AS tournament_cover_url,
            op.full_name AS organizer_full_name,
            op.avatar_url AS organizer_avatar_url
     ${REQUEST_FROM}
     INNER JOIN schema_tournaments.tournaments t ON t.tournament_id = r.tournament_id
     LEFT JOIN schema_auth.user_profiles op ON op.user_id = t.organizer_user_id
     WHERE r.captain_user_id = $1
       AND r.status = ANY($2::text[])
     ORDER BY
       CASE r.status WHEN '${TOURNAMENT_JOIN_REQUEST_STATUSES.PENDING}' THEN 0 ELSE 1 END,
       r.updated_at DESC,
       r.request_id DESC
     LIMIT $3 OFFSET $4`,
    [userId, statuses, limit, offset],
  );
  return rows;
}

export async function countMyJoinRequests(client, { userId, status }) {
  const statuses = myJoinRequestStatuses(status);
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM schema_tournaments.tournament_join_requests r
     WHERE r.captain_user_id = $1
       AND r.status = ANY($2::text[])`,
    [userId, statuses],
  );
  return rows[0]?.total ?? 0;
}

export async function countMyPendingJoinRequests(client, userId) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM schema_tournaments.tournament_join_requests r
     WHERE r.captain_user_id = $1
       AND r.status = $2`,
    [userId, TOURNAMENT_JOIN_REQUEST_STATUSES.PENDING],
  );
  return rows[0]?.total ?? 0;
}

export async function listPendingForOrganizer(client, { organizerUserId, limit, offset }) {
  const { rows } = await client.query(
    `SELECT ${REQUEST_SELECT},
            t.title AS tournament_title,
            t.sport AS tournament_sport,
            t.format AS tournament_format
     ${REQUEST_FROM}
     INNER JOIN schema_tournaments.tournaments t ON t.tournament_id = r.tournament_id
     WHERE t.organizer_user_id = $1
       AND r.status = $2
     ORDER BY r.created_at ASC, r.request_id ASC
     LIMIT $3 OFFSET $4`,
    [organizerUserId, TOURNAMENT_JOIN_REQUEST_STATUSES.PENDING, limit, offset],
  );
  return rows;
}

export async function countPendingForOrganizer(client, organizerUserId) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM schema_tournaments.tournament_join_requests r
     INNER JOIN schema_tournaments.tournaments t ON t.tournament_id = r.tournament_id
     WHERE t.organizer_user_id = $1
       AND r.status = $2`,
    [organizerUserId, TOURNAMENT_JOIN_REQUEST_STATUSES.PENDING],
  );
  return rows[0]?.total ?? 0;
}
