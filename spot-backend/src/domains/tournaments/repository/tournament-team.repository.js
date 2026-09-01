export async function insertTeam(client, input) {
  const { rows } = await client.query(
    `INSERT INTO schema_tournaments.tournament_teams (
       tournament_id, captain_user_id, join_request_id, team_name, team_logo_url
     ) VALUES ($1, $2, $3, $4, $5)
     RETURNING team_id, tournament_id, captain_user_id, join_request_id,
               team_name, team_logo_url, created_at`,
    [
      input.tournamentId,
      input.captainUserId,
      input.joinRequestId ?? null,
      input.teamName,
      input.teamLogoUrl,
    ],
  );
  return rows[0];
}

export async function deleteById(client, teamId) {
  await client.query(
    `DELETE FROM schema_tournaments.tournament_teams WHERE team_id = $1`,
    [teamId],
  );
}

export async function findByTournamentCaptain(client, tournamentId, captainUserId) {
  const { rows } = await client.query(
    `SELECT team_id, tournament_id, captain_user_id, join_request_id,
            team_name, team_logo_url, created_at
     FROM schema_tournaments.tournament_teams
     WHERE tournament_id = $1 AND captain_user_id = $2
     LIMIT 1`,
    [tournamentId, captainUserId],
  );
  return rows[0] || null;
}

export async function listByTournament(client, tournamentId) {
  const { rows } = await client.query(
    `SELECT tt.team_id, tt.tournament_id, tt.captain_user_id, tt.team_name,
            tt.team_logo_url, tt.created_at,
            cp.full_name AS captain_full_name,
            cp.avatar_url AS captain_avatar_url
     FROM schema_tournaments.tournament_teams tt
     LEFT JOIN schema_auth.user_profiles cp ON cp.user_id = tt.captain_user_id
     WHERE tt.tournament_id = $1
     ORDER BY tt.team_id ASC`,
    [tournamentId],
  );
  return rows;
}

export async function findByIdForUpdate(client, teamId) {
  const { rows } = await client.query(
    `SELECT team_id, tournament_id, captain_user_id, join_request_id,
            team_name, team_logo_url, created_at
     FROM schema_tournaments.tournament_teams
     WHERE team_id = $1
     LIMIT 1
     FOR UPDATE`,
    [teamId],
  );
  return rows[0] || null;
}
