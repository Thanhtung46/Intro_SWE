import { z } from 'zod';
import { TOURNAMENT_JOIN_REQUEST_STATUSES } from '../../../shared/constants/tournaments.js';

const blankToUndefined = (value) =>
  value === '' || value === undefined || value === null ? undefined : value;

export const myTournamentJoinRequestsQuerySchema = z.object({
  status: z.preprocess(
    blankToUndefined,
    z
      .enum(
        [
          TOURNAMENT_JOIN_REQUEST_STATUSES.PENDING,
          TOURNAMENT_JOIN_REQUEST_STATUSES.REJECTED,
        ],
        {
          errorMap: () => ({
            message: 'status must be PENDING or REJECTED',
          }),
        },
      )
      .optional(),
  ),
  limit: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().min(1).max(50).optional().default(20),
  ),
  offset: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().min(0).optional().default(0),
  ),
});

export function parseMyTournamentJoinRequestsQuery(query) {
  return myTournamentJoinRequestsQuerySchema.parse(query);
}
