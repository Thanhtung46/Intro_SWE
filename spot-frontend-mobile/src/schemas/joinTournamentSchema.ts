import { z } from 'zod';

import { rosterSizeFor } from '@/constants/tournamentFormats';
import type { Sport } from '@/types/match';
import type { TournamentFormat } from '@/types/tournament';

// Mirrors spot-backend/src/domains/tournaments/dto/join-tournament.dto.js
// (joinTournamentBodySchema + parseJoinRoster). The roster rules branch on the
// tournament's sport + format, which aren't editable form fields — so this is a
// factory: makeJoinTournamentSchema(sport, format). Same local-useState +
// .safeParse()-on-submit pattern as createGroupSchema.ts. jerseyNumber is held
// as a string in the form and validated/parsed here; JoinTournamentScreen maps
// the parsed values into JoinTournamentPayload (dropping jersey for badminton).

const rosterRowSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Player name is required')
    .max(120, 'Player name must be at most 120 characters'),
  jerseyNumber: z.string().trim(),
});

export type JoinRosterRow = z.infer<typeof rosterRowSchema>;

export function makeJoinTournamentSchema(sport: Sport, format: TournamentFormat) {
  const maxSize = rosterSizeFor(sport, format);
  const isFootball = sport === 'FOOTBALL';

  return z
    .object({
      teamName: z
        .string()
        .trim()
        .min(1, 'Team name is required')
        .max(150, 'Team name must be at most 150 characters'),
      teamLogoUrl: z
        .string()
        .trim()
        .url('Team logo must be a valid URL'),
      roster: z.array(rosterRowSchema),
    })
    .superRefine((data, ctx) => {
      if (isFootball) {
        if (data.roster.length < 1 || data.roster.length > maxSize) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['roster'],
            message: `Squad must have 1–${maxSize} players`,
          });
        }
        const seen = new Set<string>();
        data.roster.forEach((row, index) => {
          if (!/^\d{1,3}$/.test(row.jerseyNumber)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['roster', index, 'jerseyNumber'],
              message: 'Enter a jersey number (0–999)',
            });
            return;
          }
          if (seen.has(row.jerseyNumber)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['roster', index, 'jerseyNumber'],
              message: 'Jersey numbers must be unique',
            });
          }
          seen.add(row.jerseyNumber);
        });
      } else if (data.roster.length !== maxSize) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['roster'],
          message: `This category needs exactly ${maxSize} player${maxSize > 1 ? 's' : ''}`,
        });
      }
    });
}

export type JoinTournamentFormValues = z.infer<ReturnType<typeof makeJoinTournamentSchema>>;
