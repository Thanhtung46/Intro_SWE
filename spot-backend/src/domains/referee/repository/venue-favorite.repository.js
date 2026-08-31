export async function exists(client, refereeId, venueId) {
  const { rows } = await client.query(
    `SELECT 1
     FROM schema_referee.referee_venue_favorites
     WHERE referee_id = $1
       AND venue_id = $2
     LIMIT 1`,
    [refereeId, venueId],
  );
  return Boolean(rows[0]);
}

export async function add(client, refereeId, venueId) {
  await client.query(
    `INSERT INTO schema_referee.referee_venue_favorites (referee_id, venue_id)
     VALUES ($1, $2)
     ON CONFLICT (referee_id, venue_id) DO NOTHING`,
    [refereeId, venueId],
  );
}

export async function remove(client, refereeId, venueId) {
  await client.query(
    `DELETE FROM schema_referee.referee_venue_favorites
     WHERE referee_id = $1
       AND venue_id = $2`,
    [refereeId, venueId],
  );
}
