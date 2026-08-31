export async function insertPlayers(client, teamId, roster) {
  if (!roster.length) {
    return [];
  }
  const values = [];
  const params = [teamId];
  roster.forEach((player, index) => {
    const nameSlot = params.length + 1;
    params.push(player.name);
    const jerseySlot = params.length + 1;
    params.push(player.jerseyNumber ?? null);
    const sortSlot = params.length + 1;
    params.push(index);
    values.push(`($1, $${nameSlot}, $${jerseySlot}, $${sortSlot})`);
  });
  const { rows } = await client.query(
    `INSERT INTO schema_tournaments.tournament_roster_players (
       team_id, name, jersey_number, sort_order
     ) VALUES ${values.join(', ')}
     RETURNING roster_player_id, team_id, name, jersey_number, sort_order, rank`,
    params,
  );
  return rows;
}

export async function deleteByTeamId(client, teamId) {
  await client.query(
    `DELETE FROM schema_tournaments.tournament_roster_players WHERE team_id = $1`,
    [teamId],
  );
}

export async function listByTeamIds(client, teamIds) {
  if (!teamIds.length) {
    return new Map();
  }
  const { rows } = await client.query(
    `SELECT roster_player_id, team_id, name, jersey_number, sort_order, rank
     FROM schema_tournaments.tournament_roster_players
     WHERE team_id = ANY($1::int[])
     ORDER BY team_id, sort_order ASC, roster_player_id ASC`,
    [teamIds],
  );
  const map = new Map();
  for (const row of rows) {
    const list = map.get(row.team_id) || [];
    list.push(row);
    map.set(row.team_id, list);
  }
  return map;
}

export async function listByTournamentId(client, tournamentId) {
  const { rows } = await client.query(
    `SELECT p.roster_player_id, p.team_id, p.name, p.jersey_number, p.sort_order, p.rank,
            tt.team_name, tt.team_logo_url, tt.captain_user_id
     FROM schema_tournaments.tournament_roster_players p
     INNER JOIN schema_tournaments.tournament_teams tt ON tt.team_id = p.team_id
     WHERE tt.tournament_id = $1
     ORDER BY tt.team_id, p.sort_order ASC, p.roster_player_id ASC`,
    [tournamentId],
  );
  return rows;
}

export async function updateRanksForTournament(client, tournamentId, ranks) {
  if (!ranks.length) {
    return 0;
  }
  const params = [tournamentId];
  const cases = [];
  const idSlots = [];

  ranks.forEach((entry) => {
    const idSlot = params.length + 1;
    params.push(entry.rosterPlayerId);
    idSlots.push(`$${idSlot}`);

    const rankSlot = params.length + 1;
    params.push(entry.rank);
    cases.push(`WHEN $${idSlot} THEN $${rankSlot}::int`);
  });

  const { rowCount } = await client.query(
    `UPDATE schema_tournaments.tournament_roster_players p
     SET rank = CASE p.roster_player_id ${cases.join(' ')} END
     FROM schema_tournaments.tournament_teams tt
     WHERE p.team_id = tt.team_id
       AND tt.tournament_id = $1
       AND p.roster_player_id IN (${idSlots.join(', ')})`,
    params,
  );
  return rowCount ?? 0;
}

export async function listRosterPlayerIdsByTournament(client, tournamentId) {
  const { rows } = await client.query(
    `SELECT p.roster_player_id, p.team_id
     FROM schema_tournaments.tournament_roster_players p
     INNER JOIN schema_tournaments.tournament_teams tt ON tt.team_id = p.team_id
     WHERE tt.tournament_id = $1`,
    [tournamentId],
  );
  return rows;
}
