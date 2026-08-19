export async function insertAudit(client, {
  adminUserId,
  action,
  targetType,
  targetId,
  payload,
}) {
  const { rows } = await client.query(
    `INSERT INTO schema_auth.admin_audit_log
       (admin_user_id, action, target_type, target_id, payload)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING audit_id, admin_user_id, action, target_type, target_id,
               payload, created_at`,
    [
      adminUserId,
      action,
      targetType,
      targetId,
      payload ? JSON.stringify(payload) : null,
    ],
  );
  return rows[0];
}

export async function listRecent(client, { limit, offset }) {
  const { rows } = await client.query(
    `SELECT a.*, u.email AS admin_email
     FROM schema_auth.admin_audit_log a
     JOIN schema_auth.users u ON u.user_id = a.admin_user_id
     ORDER BY a.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );

  const { rows: countRows } = await client.query(
    `SELECT COUNT(*)::int AS total FROM schema_auth.admin_audit_log`,
  );

  return { rows, total: countRows[0]?.total ?? 0 };
}
