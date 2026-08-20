import { z } from 'zod';
import { TOURNAMENT_ROUND_CODES } from '../../../shared/constants/tournaments.js';

const isoDateSchema = z
  .string({ required_error: 'scheduledAt is required' })
  .datetime({ offset: true, message: 'Must be an ISO-8601 datetime with offset' });

export const createTournamentMatchSchema = z
  .object({
    round: z.enum(TOURNAMENT_ROUND_CODES, {
      errorMap: () => ({
        message: `round must be one of: ${TOURNAMENT_ROUND_CODES.join(', ')}`,
      }),
    }),
    teamAId: z
      .number({ required_error: 'teamAId is required' })
      .int('teamAId must be an integer')
      .min(1, 'teamAId must be positive'),
    teamBId: z
      .number({ required_error: 'teamBId is required' })
      .int('teamBId must be an integer')
      .min(1, 'teamBId must be positive'),
    scheduledAt: isoDateSchema,
  })
  .superRefine((data, ctx) => {
    if (data.teamAId === data.teamBId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['teamBId'],
        message: 'teamAId and teamBId must be different',
      });
    }
  });

export function parseCreateTournamentMatchDto(body) {
  return createTournamentMatchSchema.parse(body);
}
