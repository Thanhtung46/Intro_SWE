import pool from '../../../shared/database/pool.js';
import { AppError } from '../../../shared/middleware/errorHandler.js';
import { PG_INT4_MAX } from '../../../shared/constants/auth.js';
import { SPORTS } from '../../../shared/constants/sports.js';
import {
  TOURNAMENT_STATUSES,
} from '../../../shared/constants/tournaments.js';
import { validateBadmintonSets } from '../../../shared/constants/tournament-scoring.js';
import * as tournamentRepository from '../repository/tournament.repository.js';
import * as teamRepository from '../repository/tournament-team.repository.js';
import * as matchRepository from '../repository/tournament-match.repository.js';
import { parseCreateTournamentMatchDto } from '../dto/create-tournament-match.dto.js';
import { parseUpdateTournamentMatchDto } from '../dto/update-tournament-match.dto.js';
import { parseMatchResultDto } from '../dto/tournament-match-result.dto.js';
import { toPublicMatch } from '../entity/tournament.entity.js';

function parseTournamentId(raw) {
  const tournamentId = Number(raw);
  if (!Number.isInteger(tournamentId) || tournamentId < 1 || tournamentId > PG_INT4_MAX) {
    throw new AppError('Invalid tournament id', 400);
  }
  return tournamentId;
}

function parseMatchId(raw) {
  const matchId = Number(raw);
  if (!Number.isInteger(matchId) || matchId < 1 || matchId > PG_INT4_MAX) {
    throw new AppError('Invalid match id', 400);
  }
  return matchId;
}

function callerUserId(raw) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > PG_INT4_MAX) {
    throw new AppError('Invalid user id', 400);
  }
  return value;
}

function assertOrganizer(tournament, callerId) {
  if (Number(tournament.organizer_user_id) !== callerId) {
    throw new AppError('Only the tournament organizer can perform this action', 403);
  }
}

function assertMatchManageableStatus(status) {
  if (status === TOURNAMENT_STATUSES.CANCELLED) {
    throw new AppError('Cannot manage matches on a cancelled tournament', 400);
  }
  if (status === TOURNAMENT_STATUSES.COMPLETED) {
    throw new AppError('Cannot manage matches on a completed tournament', 400);
  }
}

async function loadTournamentForOrganizer(client, tournamentId, callerId) {
  const tournament = await tournamentRepository.lockById(client, tournamentId);
  if (!tournament) {
    throw new AppError('Tournament not found', 404);
  }
  assertOrganizer(tournament, callerId);
  assertMatchManageableStatus(tournament.status);
  return tournament;
}

async function assertTeamsBelongToTournament(
  client,
  tournamentId,
  teamAId,
  teamBId,
) {
  const teamA = await teamRepository.findByIdForUpdate(client, teamAId);
  const teamB = await teamRepository.findByIdForUpdate(client, teamBId);
  if (!teamA || Number(teamA.tournament_id) !== tournamentId) {
    throw new AppError('teamAId is not an accepted team in this tournament', 400);
  }
  if (!teamB || Number(teamB.tournament_id) !== tournamentId) {
    throw new AppError('teamBId is not an accepted team in this tournament', 400);
  }
  if (teamAId === teamBId) {
    throw new AppError('teamAId and teamBId must be different', 400);
  }
}

function assertScheduledWithinTournament(tournament, scheduledAt) {
  const when = new Date(scheduledAt).getTime();
  const start = new Date(tournament.starts_at).getTime();
  const end = new Date(tournament.ends_at).getTime();
  if (when < start || when > end) {
    throw new AppError(
      'scheduledAt must fall between tournament startsAt and endsAt',
      400,
    );
  }
}

async function formatMatch(client, row, sport) {
  const hydrated = await matchRepository.hydrateRow(client, row);
  return toPublicMatch(hydrated, sport);
}

export async function listMatches(userId, rawTournamentId) {
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
    const rows = await matchRepository.listByTournament(client, tournamentId);
    return {
      matches: rows.map((row) => toPublicMatch(row, tournament.sport)),
    };
  } finally {
    client.release();
  }
}

export async function createMatch(userId, rawTournamentId, body) {
  const tournamentId = parseTournamentId(rawTournamentId);
  const callerId = callerUserId(userId);
  const dto = parseCreateTournamentMatchDto(body);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const tournament = await loadTournamentForOrganizer(
        client,
        tournamentId,
        callerId,
      );
      assertScheduledWithinTournament(tournament, dto.scheduledAt);
      await assertTeamsBelongToTournament(
        client,
        tournamentId,
        dto.teamAId,
        dto.teamBId,
      );

      const row = await matchRepository.insert(client, {
        tournamentId,
        round: dto.round,
        teamAId: dto.teamAId,
        teamBId: dto.teamBId,
        scheduledAt: dto.scheduledAt,
      });
      await client.query('COMMIT');
      return {
        message: 'Match created',
        match: await formatMatch(client, row, tournament.sport),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}

export async function updateMatch(userId, rawTournamentId, rawMatchId, body) {
  const tournamentId = parseTournamentId(rawTournamentId);
  const matchId = parseMatchId(rawMatchId);
  const callerId = callerUserId(userId);
  const dto = parseUpdateTournamentMatchDto(body);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const tournament = await loadTournamentForOrganizer(
        client,
        tournamentId,
        callerId,
      );
      const existing = await matchRepository.findByIdForUpdate(client, matchId);
      if (!existing || Number(existing.tournament_id) !== tournamentId) {
        throw new AppError('Match not found', 404);
      }

      const nextTeamAId = dto.teamAId ?? existing.team_a_id;
      const nextTeamBId = dto.teamBId ?? existing.team_b_id;
      await assertTeamsBelongToTournament(
        client,
        tournamentId,
        nextTeamAId,
        nextTeamBId,
      );

      const nextScheduledAt = dto.scheduledAt ?? existing.scheduled_at;
      assertScheduledWithinTournament(tournament, nextScheduledAt);

      const teamsChanged =
        nextTeamAId !== existing.team_a_id || nextTeamBId !== existing.team_b_id;

      const row = await matchRepository.updateSchedule(client, matchId, {
        round: dto.round,
        teamAId: dto.teamAId,
        teamBId: dto.teamBId,
        scheduledAt: dto.scheduledAt,
        clearResult: teamsChanged,
      });
      await client.query('COMMIT');
      return {
        message: 'Match updated',
        match: await formatMatch(client, row, tournament.sport),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}

export async function updateMatchResult(
  userId,
  rawTournamentId,
  rawMatchId,
  body,
) {
  const tournamentId = parseTournamentId(rawTournamentId);
  const matchId = parseMatchId(rawMatchId);
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const tournament = await loadTournamentForOrganizer(
        client,
        tournamentId,
        callerId,
      );
      const existing = await matchRepository.findByIdForUpdate(client, matchId);
      if (!existing || Number(existing.tournament_id) !== tournamentId) {
        throw new AppError('Match not found', 404);
      }

      let row;
      if (tournament.sport === SPORTS.FOOTBALL) {
        const dto = parseMatchResultDto(body, tournament.sport);
        row = await matchRepository.updateFootballResult(client, matchId, {
          teamAGoals: dto.teamAGoals,
          teamBGoals: dto.teamBGoals,
        });
      } else if (tournament.sport === SPORTS.BADMINTON) {
        const dto = parseMatchResultDto(body, tournament.sport);
        const validationError = validateBadmintonSets(dto.sets);
        if (validationError) {
          throw new AppError(validationError, 400);
        }
        row = await matchRepository.updateBadmintonResult(client, matchId, dto.sets);
      } else {
        throw new AppError('Unsupported tournament sport', 400);
      }

      await client.query('COMMIT');
      return {
        message: 'Match result saved',
        match: await formatMatch(client, row, tournament.sport),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}

export async function deleteMatch(userId, rawTournamentId, rawMatchId) {
  const tournamentId = parseTournamentId(rawTournamentId);
  const matchId = parseMatchId(rawMatchId);
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      await loadTournamentForOrganizer(client, tournamentId, callerId);
      const existing = await matchRepository.findByIdForUpdate(client, matchId);
      if (!existing || Number(existing.tournament_id) !== tournamentId) {
        throw new AppError('Match not found', 404);
      }
      await matchRepository.deleteById(client, matchId);
      await client.query('COMMIT');
      return { message: 'Match deleted' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}
