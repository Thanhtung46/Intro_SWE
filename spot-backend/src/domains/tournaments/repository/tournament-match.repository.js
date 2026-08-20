const MATCH_SELECT = `
  m.match_id, m.tournament_id, m.round, m.team_a_id, m.team_b_id,
  m.scheduled_at, m.team_a_goals, m.team_b_goals, m.sets_json,
  m.created_at, m.updated_at,
  ta.team_name AS team_a_name, ta.team_logo_url AS team_a_logo_url,
  tb.team_name AS team_b_name, tb.team_logo_url AS team_b_logo_url
`;

const MATCH_FROM = `
  FROM schema_tournaments.tournament_matches m
  INNER JOIN schema_tournaments.tournament_teams ta ON ta.team_id = m.team_a_id
  INNER JOIN schema_tournaments.tournament_teams tb ON tb.team_id = m.team_b_id
`;

export async function listByTournament(client, tournamentId) {
  const { rows } = await client.query(
    `SELECT ${MATCH_SELECT}
     ${MATCH_FROM}
     WHERE m.tournament_id = $1
     ORDER BY m.scheduled_at ASC, m.match_id ASC`,
    [tournamentId],
  );
  return rows;
}

export async function findById(client, matchId) {
  const { rows } = await client.query(
    `SELECT ${MATCH_SELECT}
     ${MATCH_FROM}
     WHERE m.match_id = $1
     LIMIT 1`,
    [matchId],
  );
  return rows[0] || null;
}

export async function findByIdForUpdate(client, matchId) {
  const { rows } = await client.query(
    `SELECT ${MATCH_SELECT}
     ${MATCH_FROM}
     WHERE m.match_id = $1
     LIMIT 1
     FOR UPDATE OF m`,
    [matchId],
  );
  return rows[0] || null;
}

export async function insert(client, input) {
  const { rows } = await client.query(
    `INSERT INTO schema_tournaments.tournament_matches (
       tournament_id, round, team_a_id, team_b_id, scheduled_at
     ) VALUES ($1, $2, $3, $4, $5)
     RETURNING match_id, tournament_id, round, team_a_id, team_b_id,
               scheduled_at, team_a_goals, team_b_goals, sets_json,
               created_at, updated_at`,
    [
      input.tournamentId,
      input.round,
      input.teamAId,
      input.teamBId,
      input.scheduledAt,
    ],
  );
  return rows[0];
}

export async function updateSchedule(client, matchId, input) {
  const { rows } = await client.query(
    `UPDATE schema_tournaments.tournament_matches
     SET round = COALESCE($2, round),
         team_a_id = COALESCE($3, team_a_id),
         team_b_id = COALESCE($4, team_b_id),
         scheduled_at = COALESCE($5, scheduled_at),
         team_a_goals = CASE WHEN $6 THEN NULL ELSE team_a_goals END,
         team_b_goals = CASE WHEN $6 THEN NULL ELSE team_b_goals END,
         sets_json = CASE WHEN $6 THEN NULL ELSE sets_json END,
         updated_at = CURRENT_TIMESTAMP
     WHERE match_id = $1
     RETURNING match_id, tournament_id, round, team_a_id, team_b_id,
               scheduled_at, team_a_goals, team_b_goals, sets_json,
               created_at, updated_at`,
    [
      matchId,
      input.round ?? null,
      input.teamAId ?? null,
      input.teamBId ?? null,
      input.scheduledAt ?? null,
      Boolean(input.clearResult),
    ],
  );
  return rows[0] || null;
}

export async function updateFootballResult(client, matchId, { teamAGoals, teamBGoals }) {
  const { rows } = await client.query(
    `UPDATE schema_tournaments.tournament_matches
     SET team_a_goals = $2,
         team_b_goals = $3,
         sets_json = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE match_id = $1
     RETURNING match_id, tournament_id, round, team_a_id, team_b_id,
               scheduled_at, team_a_goals, team_b_goals, sets_json,
               created_at, updated_at`,
    [matchId, teamAGoals, teamBGoals],
  );
  return rows[0] || null;
}

export async function updateBadmintonResult(client, matchId, sets) {
  const { rows } = await client.query(
    `UPDATE schema_tournaments.tournament_matches
     SET sets_json = $2::jsonb,
         team_a_goals = NULL,
         team_b_goals = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE match_id = $1
     RETURNING match_id, tournament_id, round, team_a_id, team_b_id,
               scheduled_at, team_a_goals, team_b_goals, sets_json,
               created_at, updated_at`,
    [matchId, JSON.stringify(sets)],
  );
  return rows[0] || null;
}

export async function deleteById(client, matchId) {
  await client.query(
    `DELETE FROM schema_tournaments.tournament_matches WHERE match_id = $1`,
    [matchId],
  );
}

export async function hydrateRow(client, row) {
  if (!row) {
    return null;
  }
  const full = await findById(client, row.match_id);
  return full ?? row;
}
