import pool from '../../../shared/database/pool.js';
import { AppError } from '../../../shared/middleware/errorHandler.js';
import { JOIN_REQUEST_STATUSES, MATCH_STATUSES } from '../../../shared/constants/matchmaking.js';
import { REVIEW_MAX_PER_PLAYER_PER_DAY } from '../../../shared/constants/review.js';
import * as matchRepository from '../../matchmaking/repository/match.repository.js';
import * as joinRequestRepository from '../../matchmaking/repository/join-request.repository.js';
import * as matchHostReviewRepository from '../repository/match-host-review.repository.js';
import { parseCreateMatchHostReviewDto, parseListHostReviewsQuery } from '../dto/create-match-host-review.dto.js';
import {
  toPublicMatchHostReview,
  toPublicMatchHostReviewListItem,
  toPublicHostRatingAggregate,
} from '../entity/match-host-review.entity.js';

export function isMatchReviewable(match, { now = Date.now() } = {}) {
  if (!match) {
    return false;
  }
  if (match.status === MATCH_STATUSES.CANCELLED) {
    return false;
  }
  if (new Date(match.ends_at).getTime() > now) {
    return false;
  }
  if (Number(match.filled_count) < Number(match.max_players)) {
    return false;
  }
  return true;
}

export async function buildMatchReviewSummary(client, match, callerId) {
  const reviewable = isMatchReviewable(match);
  const hostRating = toPublicHostRatingAggregate(
    await matchHostReviewRepository.getHostAggregate(
      client,
      Number(match.host_user_id),
    ),
  );

  let yourReview = null;
  let canReview = false;

  if (callerId != null) {
    const existing = await matchHostReviewRepository.findByMatchAndReviewer(
      client,
      match.match_id,
      callerId,
    );
    yourReview = toPublicMatchHostReview(existing);

    if (reviewable && callerId !== Number(match.host_user_id)) {
      const participant = await joinRequestRepository.findAcceptedByMatchUser(
        client,
        match.match_id,
        callerId,
      );
      canReview = Boolean(participant) && !existing;
    }
  }

  return {
    reviewable,
    canReview,
    yourReview,
    hostRating,
  };
}

export async function createMatchHostReview(userId, rawMatchId, body) {
  const matchId = Number(rawMatchId);
  if (!Number.isInteger(matchId) || matchId < 1) {
    throw new AppError('Invalid match id', 400);
  }
  const callerId = Number(userId);
  const dto = parseCreateMatchHostReviewDto(body);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const match = await matchRepository.findById(client, matchId, callerId);
      if (!match) {
        throw new AppError('Match not found', 404);
      }
      if (callerId === Number(match.host_user_id)) {
        throw new AppError('Host cannot review their own match', 400);
      }
      if (!isMatchReviewable(match)) {
        throw new AppError('Match is not reviewable yet', 400);
      }

      const participant = await joinRequestRepository.findAcceptedByMatchUser(
        client,
        match.match_id,
        callerId,
      );
      if (!participant) {
        throw new AppError('Only accepted participants can review the host', 403);
      }

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentCount = await matchHostReviewRepository.countByReviewerSince(
        client,
        callerId,
        since,
      );
      if (recentCount >= REVIEW_MAX_PER_PLAYER_PER_DAY) {
        throw new AppError('Too many reviews in the last 24 hours', 429);
      }

      let review;
      try {
        review = await matchHostReviewRepository.insert(client, {
          matchId,
          reviewerUserId: callerId,
          hostUserId: Number(match.host_user_id),
          rating: dto.rating,
          reviewText: dto.reviewText ?? null,
        });
      } catch (err) {
        if (err.code === '23505') {
          throw new AppError('You already reviewed this match', 409);
        }
        throw err;
      }

      const hostRating = toPublicHostRatingAggregate(
        await matchHostReviewRepository.getHostAggregate(
          client,
          Number(match.host_user_id),
        ),
      );

      await client.query('COMMIT');
      return {
        message: 'Review submitted',
        review: toPublicMatchHostReview(review),
        hostRating,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}

export async function listHostMatchReviews(hostUserId, queryInput) {
  const hostId = Number(hostUserId);
  if (!Number.isInteger(hostId) || hostId < 1) {
    throw new AppError('Invalid host user id', 400);
  }
  const query = parseListHostReviewsQuery(queryInput);
  const client = await pool.connect();
  try {
    const rows = await matchHostReviewRepository.listByHost(client, hostId, {
      limit: query.limit,
      offset: query.offset,
    });
    const total = await matchHostReviewRepository.countByHost(client, hostId);
    const hostRating = toPublicHostRatingAggregate(
      await matchHostReviewRepository.getHostAggregate(client, hostId),
    );
    return {
      hostUserId: hostId,
      hostRating,
      total,
      limit: query.limit,
      offset: query.offset,
      reviews: rows.map(toPublicMatchHostReviewListItem),
    };
  } finally {
    client.release();
  }
}

export async function getHostRatingMap(client, hostUserIds) {
  return matchHostReviewRepository.getHostAggregatesForUsers(client, hostUserIds);
}

export async function getHostRatingForUser(client, hostUserId) {
  return toPublicHostRatingAggregate(
    await matchHostReviewRepository.getHostAggregate(client, hostUserId),
  );
}
