import { z } from 'zod';

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
});

export function parseMyJoinRequestsQuery(query) {
  return myJoinRequestsQuerySchema.parse(query);
}
