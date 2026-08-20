import { GROUP_JOIN_REQUEST_STATUSES } from '../../../shared/constants/groups.js';

const REQUEST_SELECT = `
  r.request_id, r.group_id, r.user_id, r.message, r.status,
  r.created_at, r.updated_at,
  p.full_name, p.avatar_url
`;

const REQUEST_FROM = `
  FROM schema_groups.group_join_requests r
  LEFT JOIN schema_auth.user_profiles p ON p.user_id = r.user_id
`;

export async function insert(client, input) {
  const { rows } = await client.query(
    `INSERT INTO schema_groups.group_join_requests (
       group_id, user_id, message, status
     ) VALUES ($1, $2, $3, $4)
     RETURNING request_id, group_id, user_id, message, status,
               created_at, updated_at`,
    [input.groupId, input.userId, input.message ?? null, input.status],
  );
  return rows[0];
}

export async function resetRequest(client, requestId, input) {
  const { rows } = await client.query(
    `UPDATE schema_groups.group_join_requests
     SET message = $2,
         status = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE request_id = $1
     RETURNING request_id, group_id, user_id, message, status,
               created_at, updated_at`,
    [requestId, input.message ?? null, input.status],
  );
  return rows[0] || null;
}

export async function findLatestByGroupUser(
  client,
  groupId,
  userId,
  { forUpdate = false } = {},
) {
  const { rows } = await client.query(
    `SELECT ${REQUEST_SELECT}
     ${REQUEST_FROM}
     WHERE r.group_id = $1
       AND r.user_id = $2
     ORDER BY r.request_id DESC
     LIMIT 1
     ${forUpdate ? 'FOR UPDATE OF r' : ''}`,
    [groupId, userId],
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

export async function listPendingByGroup(client, groupId) {
  const { rows } = await client.query(
    `SELECT ${REQUEST_SELECT}
     ${REQUEST_FROM}
     WHERE r.group_id = $1
       AND r.status = $2
     ORDER BY r.created_at ASC, r.request_id ASC`,
    [groupId, GROUP_JOIN_REQUEST_STATUSES.PENDING],
  );
  return rows;
}

export async function updateStatus(client, requestId, status) {
  const { rows } = await client.query(
    `UPDATE schema_groups.group_join_requests
     SET status = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE request_id = $1
     RETURNING request_id, group_id, user_id, message, status,
               created_at, updated_at`,
    [requestId, status],
  );
  return rows[0] || null;
}

export async function deleteById(client, requestId) {
  await client.query(
    `DELETE FROM schema_groups.group_join_requests WHERE request_id = $1`,
    [requestId],
  );
}

function myJoinRequestStatuses(status) {
  if (status === GROUP_JOIN_REQUEST_STATUSES.PENDING) {
    return [GROUP_JOIN_REQUEST_STATUSES.PENDING];
  }
  if (status === GROUP_JOIN_REQUEST_STATUSES.REJECTED) {
    return [GROUP_JOIN_REQUEST_STATUSES.REJECTED];
  }
  return [
    GROUP_JOIN_REQUEST_STATUSES.PENDING,
    GROUP_JOIN_REQUEST_STATUSES.REJECTED,
  ];
}

export async function listMyJoinRequests(
  client,
  { userId, limit, offset, status },
) {
  const statuses = myJoinRequestStatuses(status);
  const { rows } = await client.query(
    `SELECT ${REQUEST_SELECT},
            g.name AS group_name,
            g.title AS group_title,
            g.sport AS group_sport,
            g.join_mode AS group_join_mode,
            g.venue_name AS group_venue_name,
            g.venue_address AS group_venue_address,
            ap.full_name AS admin_full_name,
            ap.avatar_url AS admin_avatar_url
     ${REQUEST_FROM}
     INNER JOIN schema_groups.groups g ON g.group_id = r.group_id
     LEFT JOIN schema_auth.user_profiles ap ON ap.user_id = g.admin_user_id
     WHERE r.user_id = $1
       AND r.status = ANY($2::text[])
     ORDER BY
       CASE r.status WHEN '${GROUP_JOIN_REQUEST_STATUSES.PENDING}' THEN 0 ELSE 1 END,
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
     FROM schema_groups.group_join_requests r
     WHERE r.user_id = $1
       AND r.status = ANY($2::text[])`,
    [userId, statuses],
  );
  return rows[0]?.total ?? 0;
}

export async function countMyPendingJoinRequests(client, userId) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM schema_groups.group_join_requests r
     WHERE r.user_id = $1
       AND r.status = $2`,
    [userId, GROUP_JOIN_REQUEST_STATUSES.PENDING],
  );
  return rows[0]?.total ?? 0;
}

export async function listPendingForAdminGroups(
  client,
  { adminUserId, limit, offset },
) {
  const { rows } = await client.query(
    `SELECT ${REQUEST_SELECT},
            g.name AS group_name,
            g.title AS group_title,
            g.sport AS group_sport
     ${REQUEST_FROM}
     INNER JOIN schema_groups.groups g ON g.group_id = r.group_id
     WHERE g.admin_user_id = $1
       AND r.status = $2
     ORDER BY r.created_at ASC, r.request_id ASC
     LIMIT $3 OFFSET $4`,
    [adminUserId, GROUP_JOIN_REQUEST_STATUSES.PENDING, limit, offset],
  );
  return rows;
}

export async function countPendingForAdminGroups(client, adminUserId) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM schema_groups.group_join_requests r
     INNER JOIN schema_groups.groups g ON g.group_id = r.group_id
     WHERE g.admin_user_id = $1
       AND r.status = $2`,
    [adminUserId, GROUP_JOIN_REQUEST_STATUSES.PENDING],
  );
  return rows[0]?.total ?? 0;
}

export async function upsertKicked(client, groupId, userId) {
  const existing = await findLatestByGroupUser(client, groupId, userId, {
    forUpdate: true,
  });
  if (existing) {
    return updateStatus(client, existing.request_id, GROUP_JOIN_REQUEST_STATUSES.KICKED);
  }
  return insert(client, {
    groupId,
    userId,
    message: null,
    status: GROUP_JOIN_REQUEST_STATUSES.KICKED,
  });
}

export async function acceptAllPending(client, groupId) {
  const { rows } = await client.query(
    `UPDATE schema_groups.group_join_requests
     SET status = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE group_id = $1
       AND status = $3
     RETURNING request_id, group_id, user_id, message, status,
               created_at, updated_at`,
    [groupId, GROUP_JOIN_REQUEST_STATUSES.ACCEPTED, GROUP_JOIN_REQUEST_STATUSES.PENDING],
  );
  return rows;
}
