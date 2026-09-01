import { z } from 'zod';
import { JOIN_REQUEST_STATUSES } from '../../../shared/constants/matchmaking.js';

const blankToUndefined = (value) =>
  value === '' || value === undefined || value === null ? undefined : value;

export const myJoinRequestsQuerySchema = z.object({
  limit: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().min(1).max(50).optional().default(20),
  ),
  offset: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().min(0).optional().default(0),
  ),
  status: z.preprocess(
    blankToUndefined,
    z
      .enum([
        JOIN_REQUEST_STATUSES.PENDING,
        JOIN_REQUEST_STATUSES.REJECTED,
      ])
      .optional(),
  ),
});

export function parseMyJoinRequestsQuery(query) {
  return myJoinRequestsQuerySchema.parse(query);
}
