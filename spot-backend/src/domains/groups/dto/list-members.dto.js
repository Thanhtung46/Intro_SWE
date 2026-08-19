import { z } from 'zod';

const blankToUndefined = (value) =>
  value === '' || value === undefined || value === null ? undefined : value;

export const listGroupMembersQuerySchema = z.object({
  search: z.preprocess(
    blankToUndefined,
    z.string().trim().min(1).max(100).optional(),
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

export function parseListGroupMembersQuery(query) {
  return listGroupMembersQuerySchema.parse(query);
}
