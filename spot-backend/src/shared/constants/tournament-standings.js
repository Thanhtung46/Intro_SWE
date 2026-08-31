import { SPORTS } from './sports.js';

export const STANDINGS_POINTS = Object.freeze({
  WIN: 3,
  DRAW: 1,
  LOSS: 0,
});

function parseSetsJson(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function createEmptyRow(team) {
  return {
    teamId: Number(team.teamId),
    teamName: team.teamName,
    teamLogoUrl: team.teamLogoUrl,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    pts: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    setsWon: 0,
    setsLost: 0,
    setDifference: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    pointDifference: 0,
  };
}

function ensureTeam(map, teamId, teamMetaById) {
  if (!map.has(teamId)) {
    const meta = teamMetaById.get(teamId);
    if (!meta) {
      return null;
    }
    map.set(teamId, createEmptyRow(meta));
  }
  return map.get(teamId);
}

function finalizeRow(row) {
  row.goalDifference = row.goalsFor - row.goalsAgainst;
  row.setDifference = row.setsWon - row.setsLost;
  row.pointDifference = row.pointsFor - row.pointsAgainst;
  return row;
}

function applyFootballResult(map, teamMetaById, row) {
  if (row.team_a_goals == null || row.team_b_goals == null) {
    return;
  }
  const goalsA = Number(row.team_a_goals);
  const goalsB = Number(row.team_b_goals);
  const teamA = ensureTeam(map, Number(row.team_a_id), teamMetaById);
  const teamB = ensureTeam(map, Number(row.team_b_id), teamMetaById);
  if (!teamA || !teamB) {
    return;
  }

  teamA.played += 1;
  teamB.played += 1;
  teamA.goalsFor += goalsA;
  teamA.goalsAgainst += goalsB;
  teamB.goalsFor += goalsB;
  teamB.goalsAgainst += goalsA;

  if (goalsA > goalsB) {
    teamA.won += 1;
    teamA.pts += STANDINGS_POINTS.WIN;
    teamB.lost += 1;
  } else if (goalsA < goalsB) {
    teamB.won += 1;
    teamB.pts += STANDINGS_POINTS.WIN;
    teamA.lost += 1;
  } else {
    teamA.drawn += 1;
    teamB.drawn += 1;
    teamA.pts += STANDINGS_POINTS.DRAW;
    teamB.pts += STANDINGS_POINTS.DRAW;
  }
}

function applyBadmintonResult(map, teamMetaById, row, badmintonMatchWinnerTeamSide) {
  const sets = parseSetsJson(row.sets_json).map((set) => ({
    teamAPoints: Number(set.teamAPoints),
    teamBPoints: Number(set.teamBPoints),
  }));
  if (!sets.length) {
    return;
  }

  const teamASets = sets.filter((set) => set.teamAPoints > set.teamBPoints).length;
  const teamBSets = sets.length - teamASets;
  const winnerSide = badmintonMatchWinnerTeamSide(sets);
  if (winnerSide == null || Math.max(teamASets, teamBSets) < 2) {
    return;
  }

  const teamA = ensureTeam(map, Number(row.team_a_id), teamMetaById);
  const teamB = ensureTeam(map, Number(row.team_b_id), teamMetaById);
  if (!teamA || !teamB) {
    return;
  }

  teamA.played += 1;
  teamB.played += 1;
  teamA.setsWon += teamASets;
  teamA.setsLost += teamBSets;
  teamB.setsWon += teamBSets;
  teamB.setsLost += teamASets;

  for (const set of sets) {
    teamA.pointsFor += set.teamAPoints;
    teamA.pointsAgainst += set.teamBPoints;
    teamB.pointsFor += set.teamBPoints;
    teamB.pointsAgainst += set.teamAPoints;
  }

  if (winnerSide === 'A') {
    teamA.won += 1;
    teamA.pts += STANDINGS_POINTS.WIN;
    teamB.lost += 1;
  } else {
    teamB.won += 1;
    teamB.pts += STANDINGS_POINTS.WIN;
    teamA.lost += 1;
  }
}

function compareStandings(a, b, sport) {
  if (b.pts !== a.pts) {
    return b.pts - a.pts;
  }
  if (sport === SPORTS.FOOTBALL) {
    if (b.goalDifference !== a.goalDifference) {
      return b.goalDifference - a.goalDifference;
    }
    if (b.goalsFor !== a.goalsFor) {
      return b.goalsFor - a.goalsFor;
    }
  } else {
    if (b.setDifference !== a.setDifference) {
      return b.setDifference - a.setDifference;
    }
    if (b.pointDifference !== a.pointDifference) {
      return b.pointDifference - a.pointDifference;
    }
    if (b.pointsFor !== a.pointsFor) {
      return b.pointsFor - a.pointsFor;
    }
  }
  return a.teamName.localeCompare(b.teamName);
}

/**
 * @param {object} options
 * @param {string} options.sport
 * @param {Array<{ teamId, teamName, teamLogoUrl }>} options.teams
 * @param {Array} options.matches - raw DB match rows
 * @param {string|null} options.round - filter by round when set
 * @param {Function} options.badmintonMatchWinnerTeamSide
 */
export function computeStandings({
  sport,
  teams,
  matches,
  round = null,
  badmintonMatchWinnerTeamSide,
}) {
  const teamMetaById = new Map(
    teams.map((team) => [
      Number(team.teamId ?? team.team_id),
      {
        teamId: Number(team.teamId ?? team.team_id),
        teamName: team.teamName ?? team.team_name,
        teamLogoUrl: team.teamLogoUrl ?? team.team_logo_url,
      },
    ]),
  );

  const statsMap = new Map();
  for (const team of teamMetaById.values()) {
    statsMap.set(team.teamId, createEmptyRow(team));
  }

  const filtered = round
    ? matches.filter((match) => match.round === round)
    : matches;

  for (const match of filtered) {
    if (sport === SPORTS.FOOTBALL) {
      applyFootballResult(statsMap, teamMetaById, match);
    } else if (sport === SPORTS.BADMINTON) {
      applyBadmintonResult(
        statsMap,
        teamMetaById,
        match,
        badmintonMatchWinnerTeamSide,
      );
    }
  }

  const rows = [...statsMap.values()].map(finalizeRow);
  rows.sort((a, b) => compareStandings(a, b, sport));

  return rows.map((row, index) => ({
    rank: index + 1,
    ...row,
    drawn: sport === SPORTS.FOOTBALL ? row.drawn : undefined,
  }));
}
