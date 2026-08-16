export async function exists(client, userId, matchId) {
  const { rows } = await client.query(
    `SELECT 1
     FROM schema_matchmaking.match_favorites
     WHERE user_id = $1
       AND match_id = $2
     LIMIT 1`,
    [userId, matchId],
  );
  return Boolean(rows[0]);
}

export async function add(client, userId, matchId) {
  await client.query(
    `INSERT INTO schema_matchmaking.match_favorites (user_id, match_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, match_id) DO NOTHING`,
    [userId, matchId],
  );
}

export async function remove(client, userId, matchId) {
  await client.query(
    `DELETE FROM schema_matchmaking.match_favorites
     WHERE user_id = $1
       AND match_id = $2`,
    [userId, matchId],
  );
}
