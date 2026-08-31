import { z } from 'zod';
import { GROUP_JOIN_REQUEST_STATUSES } from '../../../shared/constants/groups.js';

const blankToUndefined = (value) =>
  value === '' || value === undefined || value === null ? undefined : value;

export const myGroupJoinRequestsQuerySchema = z.object({
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
        GROUP_JOIN_REQUEST_STATUSES.PENDING,
        GROUP_JOIN_REQUEST_STATUSES.REJECTED,
      ])
      .optional(),
  ),
});

export function parseMyGroupJoinRequestsQuery(query) {
  return myGroupJoinRequestsQuerySchema.parse(query);
}
