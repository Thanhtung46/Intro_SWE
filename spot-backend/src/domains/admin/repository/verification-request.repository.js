import { VERIFICATION_STATUSES } from '../../../shared/constants/admin.js';

const SELECT_WITH_USER = `
  SELECT vr.*,
         u.email,
         u.phone_number,
         u.role,
         u.status AS user_status,
         p.full_name
  FROM schema_auth.verification_requests vr
  JOIN schema_auth.users u ON u.user_id = vr.user_id
  LEFT JOIN schema_auth.user_profiles p ON p.user_id = u.user_id
`;

export async function findPendingByUserId(client, userId) {
  const { rows } = await client.query(
    `${SELECT_WITH_USER}
     WHERE vr.user_id = $1 AND vr.status = $2
     LIMIT 1`,
    [userId, VERIFICATION_STATUSES.PENDING],
  );
  return rows[0] || null;
}

export async function findPendingOwnerRequestByUserId(client, userId) {
  const { rows } = await client.query(
    `${SELECT_WITH_USER}
     WHERE vr.user_id = $1 AND vr.status = $2 AND vr.document_kind IS NULL
     LIMIT 1`,
    [userId, VERIFICATION_STATUSES.PENDING],
  );
  return rows[0] || null;
}

export async function listPendingByUserId(client, userId) {
  const { rows } = await client.query(
    `${SELECT_WITH_USER}
     WHERE vr.user_id = $1 AND vr.status = $2
     ORDER BY vr.created_at ASC`,
    [userId, VERIFICATION_STATUSES.PENDING],
  );
  return rows;
}

export async function findPendingByUserIdAndKind(client, userId, documentKind) {
  const { rows } = await client.query(
    `${SELECT_WITH_USER}
     WHERE vr.user_id = $1 AND vr.status = $2 AND vr.document_kind = $3
     LIMIT 1`,
    [userId, VERIFICATION_STATUSES.PENDING, documentKind],
  );
  return rows[0] || null;
}

export async function listByUserId(client, userId, { status } = {}) {
  const params = [userId];
  let statusClause = '';
  if (status) {
    params.push(status);
    statusClause = ` AND vr.status = $${params.length}`;
  }
  const { rows } = await client.query(
    `${SELECT_WITH_USER}
     WHERE vr.user_id = $1${statusClause}
     ORDER BY vr.created_at DESC`,
    params,
  );
  return rows;
}

export async function insertRequest(client, {
  userId,
  requestType,
  documentUrl,
  documentKind = null,
}) {
  const { rows } = await client.query(
    `INSERT INTO schema_auth.verification_requests
       (user_id, request_type, document_url, document_kind, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING verification_req_id, user_id, request_type, document_url,
               document_kind, status, admin_notes, reviewed_by, reviewed_at, created_at`,
    [userId, requestType, documentUrl, documentKind, VERIFICATION_STATUSES.PENDING],
  );
  return rows[0];
}

export async function findById(client, verificationReqId) {
  const { rows } = await client.query(
    `${SELECT_WITH_USER}
     WHERE vr.verification_req_id = $1
     LIMIT 1`,
    [verificationReqId],
  );
  return rows[0] || null;
}

export async function listRequests(client, { status, role, limit, offset }) {
  const params = [status];
  let roleClause = '';
  if (role) {
    params.push(role);
    roleClause = ` AND u.role = $${params.length}`;
  }
  params.push(limit, offset);

  const { rows } = await client.query(
    `${SELECT_WITH_USER}
     WHERE vr.status = $1${roleClause}
     ORDER BY vr.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  const countParams = [status];
  let countRoleClause = '';
  if (role) {
    countParams.push(role);
    countRoleClause = ` AND u.role = $2`;
  }

  const { rows: countRows } = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM schema_auth.verification_requests vr
     JOIN schema_auth.users u ON u.user_id = vr.user_id
     WHERE vr.status = $1${countRoleClause}`,
    countParams,
  );

  return { rows, total: countRows[0]?.total ?? 0 };
}

export async function updateReview(client, verificationReqId, {
  status,
  adminNotes,
  reviewedBy,
}) {
  const { rows } = await client.query(
    `UPDATE schema_auth.verification_requests
     SET status = $2,
         admin_notes = $3,
         reviewed_by = $4,
         reviewed_at = CURRENT_TIMESTAMP
     WHERE verification_req_id = $1
     RETURNING verification_req_id, user_id, request_type, document_url,
               document_kind, status, admin_notes, reviewed_by, reviewed_at, created_at`,
    [verificationReqId, status, adminNotes ?? null, reviewedBy],
  );
  return rows[0] || null;
}

export async function approveAllPendingForUser(client, userId, reviewedBy) {
  const { rows } = await client.query(
    `UPDATE schema_auth.verification_requests
     SET status = $2,
         reviewed_by = $3,
         reviewed_at = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND status = $4
     RETURNING verification_req_id, user_id, request_type, document_url,
               document_kind, status, admin_notes, reviewed_by, reviewed_at, created_at`,
    [userId, VERIFICATION_STATUSES.APPROVED, reviewedBy, VERIFICATION_STATUSES.PENDING],
  );
  return rows;
}

export async function resetRejectedForResubmit(client, verificationReqId, {
  documentUrl,
}) {
  const { rows } = await client.query(
    `UPDATE schema_auth.verification_requests
     SET document_url = $2,
         status = $3,
         admin_notes = NULL,
         reviewed_by = NULL,
         reviewed_at = NULL
     WHERE verification_req_id = $1
       AND status = $4
     RETURNING verification_req_id, user_id, request_type, document_url,
               status, admin_notes, reviewed_by, reviewed_at, created_at`,
    [
      verificationReqId,
      documentUrl,
      VERIFICATION_STATUSES.PENDING,
      VERIFICATION_STATUSES.REJECTED,
    ],
  );
  return rows[0] || null;
}

export async function findLatestRejectedByUserId(client, userId) {
  const { rows } = await client.query(
    `SELECT verification_req_id, user_id, request_type, document_url, status
     FROM schema_auth.verification_requests
     WHERE user_id = $1 AND status = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, VERIFICATION_STATUSES.REJECTED],
  );
  return rows[0] || null;
}
