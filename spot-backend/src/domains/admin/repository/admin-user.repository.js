const USER_SELECT = `
  u.user_id, u.email, u.phone_number, u.role, u.status,
  u.email_verified_at, u.role_selected_at, u.created_at, u.updated_at,
  p.full_name, p.gender, p.avatar_url
`;

const USER_FROM = `
  FROM schema_auth.users u
  LEFT JOIN schema_auth.user_profiles p ON p.user_id = u.user_id
`;

export async function listUsers(client, { role, status, q, limit, offset }) {
  const params = [];
  const clauses = ['1=1'];

  if (role) {
    params.push(role);
    clauses.push(`u.role = $${params.length}`);
  }
  if (status) {
    params.push(status);
    clauses.push(`u.status = $${params.length}`);
  }
  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    const idx = params.length;
    clauses.push(
      `(lower(u.email) LIKE $${idx} OR lower(p.full_name) LIKE $${idx} OR u.phone_number LIKE $${idx})`,
    );
  }

  const where = clauses.join(' AND ');
  params.push(limit, offset);

  const { rows } = await client.query(
    `SELECT ${USER_SELECT}
     ${USER_FROM}
     WHERE ${where}
     ORDER BY u.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  const countParams = params.slice(0, -2);
  const { rows: countRows } = await client.query(
    `SELECT COUNT(*)::int AS total
     ${USER_FROM}
     WHERE ${where}`,
    countParams,
  );

  return { rows, total: countRows[0]?.total ?? 0 };
}

export async function findAdminUserById(client, userId) {
  const { rows } = await client.query(
    `SELECT ${USER_SELECT}
     ${USER_FROM}
     WHERE u.user_id = $1
     LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
}

export async function updateUserAdmin(client, userId, { role, status }) {
  const sets = [];
  const params = [userId];

  if (role !== undefined) {
    params.push(role);
    sets.push(`role = $${params.length}`);
  }
  if (status !== undefined) {
    params.push(status);
    sets.push(`status = $${params.length}`);
  }

  if (sets.length === 0) return null;

  sets.push('updated_at = CURRENT_TIMESTAMP');

  const { rows } = await client.query(
    `UPDATE schema_auth.users
     SET ${sets.join(', ')}
     WHERE user_id = $1
     RETURNING user_id, email, phone_number, role, status,
               email_verified_at, role_selected_at, created_at, updated_at`,
    params,
  );
  return rows[0] || null;
}

export async function updateUserStatus(client, userId, status) {
  const { rows } = await client.query(
    `UPDATE schema_auth.users
     SET status = $2, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
     RETURNING user_id, status`,
    [userId, status],
  );
  return rows[0] || null;
}

export async function countRegistrationsByDay(client, { days, role }) {
  const params = [days];
  let roleClause = '';
  if (role) {
    params.push(role);
    roleClause = ` AND role = $${params.length}`;
  }

  const { rows } = await client.query(
    `SELECT date_trunc('day', created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day,
            COUNT(*)::int AS count
     FROM schema_auth.users
     WHERE created_at >= (CURRENT_TIMESTAMP - ($1::int || ' days')::interval)${roleClause}
     GROUP BY 1
     ORDER BY 1 ASC`,
    params,
  );
  return rows;
}

export async function sumBookingRevenue(client) {
  const { rows } = await client.query(
    `SELECT COALESCE(SUM(total_amount), 0)::numeric AS total
     FROM schema_booking.bookings
     WHERE status IN ('PAID', 'CHECKED_IN', 'COMPLETED')`,
  );
  return Number(rows[0]?.total ?? 0);
}

export async function sumMatchmakingRevenue(client) {
  const { rows } = await client.query(
    `SELECT COALESCE(SUM(share_amount), 0)::bigint AS total
     FROM schema_matchmaking.match_join_requests
     WHERE payment_status = 'SUCCESS' AND share_amount IS NOT NULL`,
  );
  return Number(rows[0]?.total ?? 0);
}

export async function countUsers(client) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS total FROM schema_auth.users`,
  );
  return rows[0]?.total ?? 0;
}

export async function countPendingApprovals(client) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM schema_auth.verification_requests
     WHERE status = 'PENDING'`,
  );
  return rows[0]?.total ?? 0;
}
