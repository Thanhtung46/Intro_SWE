import { parseCreateMatchDto } from '../dto/create-match.dto.js';
import { parseCreateMatchBulkDto } from '../dto/create-match-bulk.dto.js';
import { parseVenueSuggestionsQuery } from '../dto/venue-suggestions.dto.js';
import { parseListMatchesQuery } from '../dto/list-matches.dto.js';
import { parseListMineQuery } from '../dto/list-mine.dto.js';
import { parseMyJoinRequestsQuery } from '../dto/my-join-requests.dto.js';
import { parseUpdateMatchDto } from '../dto/update-match.dto.js';
import * as matchService from '../service/match.service.js';

export async function create(req, res, next) {
  try {
    const dto = parseCreateMatchDto(req.body);
    const result = await matchService.createMatch(req.user.userId, dto);
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function createBulk(req, res, next) {
  try {
    const dto = parseCreateMatchBulkDto(req.body);
    const result = await matchService.createMatchesBulk(req.user.userId, dto);
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function venueSuggestions(req, res, next) {
  try {
    const query = parseVenueSuggestionsQuery(req.query);
    const result = await matchService.listVenueSuggestions(
      req.user.userId,
      query,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function list(req, res, next) {
  try {
    const query = parseListMatchesQuery(req.query);
    const result = await matchService.listMatches(req.user.userId, query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function detail(req, res, next) {
  try {
    const result = await matchService.getMatch(req.user.userId, req.params.id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function join(req, res, next) {
  try {
    const result = await matchService.joinMatch(
      req.user.userId,
      req.params.id,
      req.body,
    );
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function listRequests(req, res, next) {
  try {
    const result = await matchService.listJoinRequests(
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
    const result = await matchService.acceptJoinRequest(
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
    const result = await matchService.rejectJoinRequest(
      req.user.userId,
      req.params.id,
      req.params.requestId,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function kick(req, res, next) {
  try {
    const result = await matchService.kickParticipant(
      req.user.userId,
      req.params.id,
      req.params.userId,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function mine(req, res, next) {
  try {
    const query = parseListMineQuery(req.query);
    const result = await matchService.listMine(req.user.userId, query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function myJoinRequests(req, res, next) {
  try {
    const query = parseMyJoinRequestsQuery(req.query);
    const result = await matchService.listMyJoinRequests(
      req.user.userId,
      query,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function update(req, res, next) {
  try {
    const dto = parseUpdateMatchDto(req.body);
    const result = await matchService.updateMatch(
      req.user.userId,
      req.params.id,
      dto,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function cancel(req, res, next) {
  try {
    const result = await matchService.cancelMatch(
      req.user.userId,
      req.params.id,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function favorite(req, res, next) {
  try {
    const result = await matchService.favoriteMatch(
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
    const result = await matchService.unfavoriteMatch(
      req.user.userId,
      req.params.id,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}
