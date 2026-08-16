export async function insertCourts(client, matchId, courts) {
  if (!courts.length) {
    return [];
  }

  const values = [];
  const params = [];
  courts.forEach((court, index) => {
    const base = index * 3;
    values.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
    params.push(matchId, court.name ?? null, index);
  });

  const { rows } = await client.query(
    `INSERT INTO schema_matchmaking.match_courts (match_id, name, sort_order)
     VALUES ${values.join(', ')}
     RETURNING court_id, match_id, name, sort_order`,
    params,
  );
  return rows;
}

export async function findByMatchId(client, matchId) {
  const { rows } = await client.query(
    `SELECT court_id, match_id, name, sort_order
     FROM schema_matchmaking.match_courts
     WHERE match_id = $1
     ORDER BY sort_order ASC, court_id ASC`,
    [matchId],
  );
  return rows;
}

export async function deleteByMatchId(client, matchId) {
  await client.query(
    `DELETE FROM schema_matchmaking.match_courts WHERE match_id = $1`,
    [matchId],
  );
}

export async function findByMatchIds(client, matchIds) {
  if (!matchIds.length) {
    return [];
  }
  const { rows } = await client.query(
    `SELECT court_id, match_id, name, sort_order
     FROM schema_matchmaking.match_courts
     WHERE match_id = ANY($1::int[])
     ORDER BY match_id ASC, sort_order ASC, court_id ASC`,
    [matchIds],
  );
  return rows;
}
