import { GROUP_MEMBER_ROLES } from '../../../shared/constants/groups.js';

const FOLD = 'schema_matchmaking.fold_search_text';

export async function insertAdmin(client, groupId, userId) {
  const { rows } = await client.query(
    `INSERT INTO schema_groups.group_members (group_id, user_id, role)
     VALUES ($1, $2, $3)
     RETURNING member_id, group_id, user_id, role, joined_at`,
    [groupId, userId, GROUP_MEMBER_ROLES.ADMIN],
  );
  return rows[0];
}

export async function insertMember(client, groupId, userId) {
  const { rows } = await client.query(
    `INSERT INTO schema_groups.group_members (group_id, user_id, role)
     VALUES ($1, $2, $3)
     RETURNING member_id, group_id, user_id, role, joined_at`,
    [groupId, userId, GROUP_MEMBER_ROLES.MEMBER],
  );
  return rows[0];
}

export async function findMembership(client, groupId, userId) {
  const { rows } = await client.query(
    `SELECT member_id, group_id, user_id, role, joined_at
     FROM schema_groups.group_members
     WHERE group_id = $1 AND user_id = $2
     LIMIT 1`,
    [groupId, userId],
  );
  return rows[0] || null;
}

export async function findMembershipForUpdate(client, groupId, userId) {
  const { rows } = await client.query(
    `SELECT member_id, group_id, user_id, role, joined_at
     FROM schema_groups.group_members
     WHERE group_id = $1 AND user_id = $2
     LIMIT 1
     FOR UPDATE`,
    [groupId, userId],
  );
  return rows[0] || null;
}

export async function removeMember(client, groupId, userId) {
  const { rowCount } = await client.query(
    `DELETE FROM schema_groups.group_members
     WHERE group_id = $1 AND user_id = $2`,
    [groupId, userId],
  );
  return rowCount > 0;
}

export async function updateRole(client, groupId, userId, role) {
  const { rows } = await client.query(
    `UPDATE schema_groups.group_members
     SET role = $3
     WHERE group_id = $1 AND user_id = $2
     RETURNING member_id, group_id, user_id, role, joined_at`,
    [groupId, userId, role],
  );
  return rows[0] || null;
}

export async function listPreviewAvatars(client, groupIds, limitPerGroup = 3) {
  const map = new Map();
  if (!groupIds.length) {
    return map;
  }
  const { rows } = await client.query(
    `SELECT x.group_id, x.avatar_url
     FROM (
       SELECT gm.group_id,
              p.avatar_url,
              gm.user_id,
              ROW_NUMBER() OVER (
                PARTITION BY gm.group_id
                ORDER BY CASE WHEN gm.role = 'ADMIN' THEN 0 ELSE 1 END, gm.joined_at ASC
              ) AS rn
       FROM schema_groups.group_members gm
       LEFT JOIN schema_auth.user_profiles p ON p.user_id = gm.user_id
       WHERE gm.group_id = ANY($1::int[])
     ) x
     WHERE x.rn <= $2
       AND x.avatar_url IS NOT NULL
     ORDER BY x.group_id, x.rn`,
    [groupIds, limitPerGroup],
  );
  for (const row of rows) {
    const list = map.get(row.group_id) || [];
    list.push(row.avatar_url);
    map.set(row.group_id, list);
  }
  return map;
}

export async function listByGroupId(
  client,
  groupId,
  { search, limit, offset },
) {
  const params = [groupId];
  const where = ['gm.group_id = $1'];

  if (search) {
    params.push(search);
    const q = `${FOLD}($${params.length})`;
    const name = `${FOLD}(COALESCE(p.full_name, ''))`;
    where.push(`(
      ${q} <> ''
      AND (
        position(${q} in ${name}) > 0
        OR similarity(${name}, ${q}) >= 0.28
      )
    )`);
  }

  params.push(limit, offset);
  const limitSlot = `$${params.length - 1}`;
  const offsetSlot = `$${params.length}`;

  const { rows } = await client.query(
    `SELECT gm.member_id, gm.group_id, gm.user_id, gm.role, gm.joined_at,
            p.full_name, p.avatar_url
     FROM schema_groups.group_members gm
     LEFT JOIN schema_auth.user_profiles p ON p.user_id = gm.user_id
     WHERE ${where.join(' AND ')}
     ORDER BY CASE WHEN gm.role = 'ADMIN' THEN 0 ELSE 1 END,
              gm.joined_at ASC,
              gm.member_id ASC
     LIMIT ${limitSlot} OFFSET ${offsetSlot}`,
    params,
  );
  return rows;
}

export async function countByGroupId(client, groupId, { search } = {}) {
  const params = [groupId];
  const where = ['gm.group_id = $1'];

  if (search) {
    params.push(search);
    const q = `${FOLD}($${params.length})`;
    const name = `${FOLD}(COALESCE(p.full_name, ''))`;
    where.push(`(
      ${q} <> ''
      AND (
        position(${q} in ${name}) > 0
        OR similarity(${name}, ${q}) >= 0.28
      )
    )`);
  }

  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM schema_groups.group_members gm
     LEFT JOIN schema_auth.user_profiles p ON p.user_id = gm.user_id
     WHERE ${where.join(' AND ')}`,
    params,
  );
  return rows[0]?.total ?? 0;
}
