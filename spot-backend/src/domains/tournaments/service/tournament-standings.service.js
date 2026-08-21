import pool from '../../../shared/database/pool.js';
import { AppError } from '../../../shared/middleware/errorHandler.js';
import { PG_INT4_MAX } from '../../../shared/constants/auth.js';
import { badmintonMatchWinnerTeamSide } from '../../../shared/constants/tournament-scoring.js';
import { computeStandings } from '../../../shared/constants/tournament-standings.js';
import * as tournamentRepository from '../repository/tournament.repository.js';
import * as teamRepository from '../repository/tournament-team.repository.js';
import * as matchRepository from '../repository/tournament-match.repository.js';

function parseTournamentId(raw) {
  const tournamentId = Number(raw);
  if (!Number.isInteger(tournamentId) || tournamentId < 1 || tournamentId > PG_INT4_MAX) {
    throw new AppError('Invalid tournament id', 400);
  }
  return tournamentId;
}

function callerUserId(raw) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > PG_INT4_MAX) {
    throw new AppError('Invalid user id', 400);
  }
  return value;
}

export async function getStandings(userId, rawTournamentId, query) {
  const tournamentId = parseTournamentId(rawTournamentId);
  const client = await pool.connect();
  try {
    const tournament = await tournamentRepository.findById(
      client,
      tournamentId,
      callerUserId(userId),
    );
    if (!tournament) {
      throw new AppError('Tournament not found', 404);
    }

    const teamRows = await teamRepository.listByTournament(client, tournamentId);
    const matchRows = await matchRepository.listByTournament(client, tournamentId);

    const teams = teamRows.map((row) => ({
      teamId: row.team_id,
      teamName: row.team_name,
      teamLogoUrl: row.team_logo_url,
    }));

    const standings = computeStandings({
      sport: tournament.sport,
      teams,
      matches: matchRows,
      round: query.round ?? null,
      badmintonMatchWinnerTeamSide,
    });

    return {
      tournamentId,
      sport: tournament.sport,
      round: query.round ?? null,
      standings,
    };
  } finally {
    client.release();
  }
}
