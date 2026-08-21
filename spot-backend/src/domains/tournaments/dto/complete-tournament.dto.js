import { z } from 'zod';

const winnerEntrySchema = z.object({
  place: z
    .number({ required_error: 'place is required' })
    .int('place must be an integer')
    .min(1, 'place must be at least 1')
    .max(128, 'place must be at most 128'),
  teamId: z
    .number({ required_error: 'teamId is required' })
    .int('teamId must be an integer')
    .min(1, 'teamId must be at least 1'),
});

export const completeTournamentSchema = z
  .object({
    winners: z.array(winnerEntrySchema).max(10).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.winners?.length) {
      return;
    }
    const places = data.winners.map((entry) => entry.place);
    if (new Set(places).size !== places.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['winners'],
        message: 'winners places must be unique',
      });
    }
    const teamIds = data.winners.map((entry) => entry.teamId);
    if (new Set(teamIds).size !== teamIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['winners'],
        message: 'winners teamId values must be unique',
      });
    }
  });

export function parseCompleteTournamentDto(body) {
  return completeTournamentSchema.parse(body ?? {});
}
