import { parseCreateTournamentDto } from '../dto/create-tournament.dto.js';
import { parseListTournamentsQuery } from '../dto/list-tournaments.dto.js';
import { parseListTournamentMineQuery } from '../dto/list-mine.dto.js';
import { parseMyTournamentJoinRequestsQuery } from '../dto/my-join-requests.dto.js';
import { parseStandingsQuery } from '../dto/standings-query.dto.js';
import * as tournamentService from '../service/tournament.service.js';
import * as tournamentMatchService from '../service/tournament-match.service.js';
import * as tournamentStandingsService from '../service/tournament-standings.service.js';
import { SPORT_CODES } from '../../../shared/constants/sports.js';
import { AppError } from '../../../shared/middleware/errorHandler.js';

function mergeSportFromQuery(body, query) {
  const sport = query.sport ?? body.sport;
  if (!sport) {
    throw new AppError(
      `sport is required (query ?sport= or body); one of: ${SPORT_CODES.join(', ')}`,
      400,
    );
  }
  return { ...body, sport };
}

export async function create(req, res, next) {
  try {
    const dto = parseCreateTournamentDto(mergeSportFromQuery(req.body, req.query));
    const result = await tournamentService.createTournament(req.user.userId, dto);
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function list(req, res, next) {
  try {
    const query = parseListTournamentsQuery(req.query);
    const result = await tournamentService.listTournaments(req.user.userId, query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function detail(req, res, next) {
  try {
    const result = await tournamentService.getTournament(req.user.userId, req.params.id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function mine(req, res, next) {
  try {
    const query = parseListTournamentMineQuery(req.query);
    const result = await tournamentService.listMine(req.user.userId, query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function myJoinRequests(req, res, next) {
  try {
    const query = parseMyTournamentJoinRequestsQuery(req.query);
    const result = await tournamentService.listMyJoinRequests(req.user.userId, query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function join(req, res, next) {
  try {
    const result = await tournamentService.joinTournament(
      req.user.userId,
      req.params.id,
      req.body,
    );
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function withdrawJoin(req, res, next) {
  try {
    const result = await tournamentService.withdrawJoinRequest(
      req.user.userId,
      req.params.id,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function listRequests(req, res, next) {
  try {
    const result = await tournamentService.listJoinRequests(
      req.user.userId,
      req.params.id,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function acceptRequest(req, res, next) {
  try {
    const result = await tournamentService.acceptJoinRequest(
      req.user.userId,
      req.params.id,
      req.params.requestId,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function rejectRequest(req, res, next) {
  try {
    const result = await tournamentService.rejectJoinRequest(
      req.user.userId,
      req.params.id,
      req.params.requestId,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function cancel(req, res, next) {
  try {
    const result = await tournamentService.cancelTournament(
      req.user.userId,
      req.params.id,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function update(req, res, next) {
  try {
    const result = await tournamentService.updateTournament(
      req.user.userId,
      req.params.id,
      req.body,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function complete(req, res, next) {
  try {
    const result = await tournamentService.completeTournament(
      req.user.userId,
      req.params.id,
      req.body,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function kickTeam(req, res, next) {
  try {
    const result = await tournamentService.kickTeam(
      req.user.userId,
      req.params.id,
      req.params.teamId,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function favorite(req, res, next) {
  try {
    const result = await tournamentService.favoriteTournament(
      req.user.userId,
      req.params.id,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function unfavorite(req, res, next) {
  try {
    const result = await tournamentService.unfavoriteTournament(
      req.user.userId,
      req.params.id,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function players(req, res, next) {
  try {
    const result = await tournamentService.listPlayers(req.user.userId, req.params.id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function listMatches(req, res, next) {
  try {
    const result = await tournamentMatchService.listMatches(
      req.user.userId,
      req.params.id,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function createMatch(req, res, next) {
  try {
    const result = await tournamentMatchService.createMatch(
      req.user.userId,
      req.params.id,
      req.body,
    );
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function updateMatch(req, res, next) {
  try {
    const result = await tournamentMatchService.updateMatch(
      req.user.userId,
      req.params.id,
      req.params.matchId,
      req.body,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function updateMatchResult(req, res, next) {
  try {
    const result = await tournamentMatchService.updateMatchResult(
      req.user.userId,
      req.params.id,
      req.params.matchId,
      req.body,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function deleteMatch(req, res, next) {
  try {
    const result = await tournamentMatchService.deleteMatch(
      req.user.userId,
      req.params.id,
      req.params.matchId,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function standings(req, res, next) {
  try {
    const query = parseStandingsQuery(req.query);
    const result = await tournamentStandingsService.getStandings(
      req.user.userId,
      req.params.id,
      query,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}
