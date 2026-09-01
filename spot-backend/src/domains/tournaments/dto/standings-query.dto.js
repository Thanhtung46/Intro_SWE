import { z } from 'zod';
import { TOURNAMENT_ROUND_CODES } from '../../../shared/constants/tournaments.js';

const blankToUndefined = (value) =>
  value === '' || value === undefined || value === null ? undefined : value;

export const standingsQuerySchema = z.object({
  round: z.preprocess(
    blankToUndefined,
    z
      .enum(TOURNAMENT_ROUND_CODES, {
        errorMap: () => ({
          message: `round must be one of: ${TOURNAMENT_ROUND_CODES.join(', ')}`,
        }),
      })
      .optional(),
  ),
});

export function parseStandingsQuery(query) {
  return standingsQuerySchema.parse(query);
}
