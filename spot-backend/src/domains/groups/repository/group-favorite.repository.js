export async function exists(client, userId, groupId) {
  const { rows } = await client.query(
    `SELECT 1
     FROM schema_groups.group_favorites
     WHERE user_id = $1
       AND group_id = $2
     LIMIT 1`,
    [userId, groupId],
  );
  return Boolean(rows[0]);
}

export async function add(client, userId, groupId) {
  await client.query(
    `INSERT INTO schema_groups.group_favorites (user_id, group_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, group_id) DO NOTHING`,
    [userId, groupId],
  );
}

export async function remove(client, userId, groupId) {
  await client.query(
    `DELETE FROM schema_groups.group_favorites
     WHERE user_id = $1
       AND group_id = $2`,
    [userId, groupId],
  );
}
