import { z } from 'zod';
import { TOURNAMENT_ROUND_CODES } from '../../../shared/constants/tournaments.js';

const isoDateSchema = z
  .string()
  .datetime({ offset: true, message: 'Must be an ISO-8601 datetime with offset' });

export const updateTournamentMatchSchema = z
  .object({
    round: z
      .enum(TOURNAMENT_ROUND_CODES, {
        errorMap: () => ({
          message: `round must be one of: ${TOURNAMENT_ROUND_CODES.join(', ')}`,
        }),
      })
      .optional(),
    teamAId: z.number().int().min(1).optional(),
    teamBId: z.number().int().min(1).optional(),
    scheduledAt: isoDateSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.teamAId != null &&
      data.teamBId != null &&
      data.teamAId === data.teamBId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['teamBId'],
        message: 'teamAId and teamBId must be different',
      });
    }
    const hasField =
      data.round != null ||
      data.teamAId != null ||
      data.teamBId != null ||
      data.scheduledAt != null;
    if (!hasField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: 'At least one field is required',
      });
    }
  });

export function parseUpdateTournamentMatchDto(body) {
  return updateTournamentMatchSchema.parse(body);
}
