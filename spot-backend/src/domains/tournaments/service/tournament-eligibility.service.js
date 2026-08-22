import { AppError } from '../../../shared/middleware/errorHandler.js';
import {
  TOURNAMENT_CREATE_ELIGIBILITY,
} from '../../../shared/constants/tournaments.js';
import { getHostRatingForUser } from '../../review/service/match-host-review.service.js';
import * as matchRepository from '../../matchmaking/repository/match.repository.js';

export async function assertCanCreateTournament(client, userId) {
  const completedCount = await matchRepository.countCompletedHostedByUser(
    client,
    userId,
  );
  if (completedCount < TOURNAMENT_CREATE_ELIGIBILITY.MIN_COMPLETED_HOSTED) {
    throw new AppError(
      `You need at least ${TOURNAMENT_CREATE_ELIGIBILITY.MIN_COMPLETED_HOSTED} completed hosted matches to create a tournament`,
      403,
      { completedHostedCount: completedCount },
    );
  }

  const hostRating = await getHostRatingForUser(client, userId);
  const avgRating = hostRating?.avgRating;
  if (
    avgRating == null ||
    avgRating < TOURNAMENT_CREATE_ELIGIBILITY.MIN_AVG_HOST_RATING
  ) {
    throw new AppError(
      `Host rating must be at least ${TOURNAMENT_CREATE_ELIGIBILITY.MIN_AVG_HOST_RATING} to create a tournament`,
      403,
      { avgRating: avgRating ?? null },
    );
  }
}
