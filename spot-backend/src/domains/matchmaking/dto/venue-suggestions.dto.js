import { z } from 'zod';
import { SPORT_CODES } from '../../../shared/constants/sports.js';
import { MATCH_SEARCH } from '../../../shared/constants/matchmaking.js';

function blankToUndefined(value) {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }
  return value;
}

export const venueSuggestionsQuerySchema = z.object({
  location: z.preprocess(
    blankToUndefined,
    z.string().trim().min(1).max(255),
  ),
  sport: z.preprocess(
    blankToUndefined,
    z.enum(SPORT_CODES).optional(),
  ),
  limit: z.preprocess(
    (value) => (value === '' || value == null ? undefined : value),
    z.coerce
      .number()
      .int()
      .min(1)
      .max(MATCH_SEARCH.VENUE_SUGGEST_LIMIT)
      .optional()
      .default(MATCH_SEARCH.VENUE_SUGGEST_LIMIT),
  ),
});

export function parseVenueSuggestionsQuery(query) {
  return venueSuggestionsQuerySchema.parse(query);
}
