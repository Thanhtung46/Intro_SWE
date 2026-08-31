export async function addFavorite(client, userId, tournamentId) {
  await client.query(
    `INSERT INTO schema_tournaments.tournament_favorites (user_id, tournament_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, tournament_id) DO NOTHING`,
    [userId, tournamentId],
  );
}

export async function removeFavorite(client, userId, tournamentId) {
  await client.query(
    `DELETE FROM schema_tournaments.tournament_favorites
     WHERE user_id = $1 AND tournament_id = $2`,
    [userId, tournamentId],
  );
}

export async function isFavorited(client, userId, tournamentId) {
  const { rows } = await client.query(
    `SELECT 1
     FROM schema_tournaments.tournament_favorites
     WHERE user_id = $1 AND tournament_id = $2
     LIMIT 1`,
    [userId, tournamentId],
  );
  return rows.length > 0;
}
