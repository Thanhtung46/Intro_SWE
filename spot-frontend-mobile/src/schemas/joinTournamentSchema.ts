import { z } from 'zod';

import { rosterSizeFor } from '@/constants/tournamentFormats';
import type { TranslationKey } from '@/i18n/translations';
import type { Sport } from '@/types/match';
import type { TournamentFormat } from '@/types/tournament';

// Mirrors spot-backend/src/domains/tournaments/dto/join-tournament.dto.js
// (joinTournamentBodySchema + parseJoinRoster). The roster rules branch on the
// tournament's sport + format, which aren't editable form fields — so this is a
// factory: makeJoinTournamentSchema(sport, format). Same local-useState +
// .safeParse()-on-submit pattern as createGroupSchema.ts. jerseyNumber is held
// as a string in the form and validated/parsed here; JoinTournamentScreen maps
// the parsed values into JoinTournamentPayload (dropping jersey for badminton).

export type JoinRosterRow = { name: string; jerseyNumber: string };
type Translate = (key: TranslationKey) => string;

export function makeJoinTournamentSchema(sport: Sport, format: TournamentFormat, t: Translate) {
  const maxSize = rosterSizeFor(sport, format);
  const isFootball = sport === 'FOOTBALL';
  const rosterRowSchema = z.object({
    name: z.string().trim()
      .min(1, t('tournaments.join.validation.playerNameRequired'))
      .max(120, t('tournaments.join.validation.playerNameTooLong')),
    jerseyNumber: z.string().trim(),
  });

  return z
    .object({
      teamName: z
        .string()
        .trim()
        .min(1, t('tournaments.join.validation.teamNameRequired'))
        .max(150, t('tournaments.join.validation.teamNameTooLong')),
      teamLogoUrl: z
        .string()
        .trim()
        .url(t('tournaments.join.validation.logoUrlInvalid')),
      roster: z.array(rosterRowSchema),
    })
    .superRefine((data, ctx) => {
      if (isFootball) {
        if (data.roster.length < 1 || data.roster.length > maxSize) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['roster'],
            message: t('tournaments.join.validation.rosterRange').replace('{max}', String(maxSize)),
          });
        }
        // Compare numerically — the payload sends Number(jerseyNumber), so "7"
        // and "07" collide once submitted; catch that inline rather than
        // letting the backend reject the duplicate.
        const seen = new Set<number>();
        data.roster.forEach((row, index) => {
          if (!/^\d{1,3}$/.test(row.jerseyNumber)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['roster', index, 'jerseyNumber'],
              message: t('tournaments.join.validation.jerseyInvalid'),
            });
            return;
          }
          const num = Number(row.jerseyNumber);
          if (seen.has(num)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['roster', index, 'jerseyNumber'],
              message: t('tournaments.join.validation.jerseyDuplicate'),
            });
          }
          seen.add(num);
        });
      } else if (data.roster.length !== maxSize) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['roster'],
          message: t('tournaments.join.validation.rosterExact').replace('{count}', String(maxSize)),
        });
      }
    });
}

export type JoinTournamentFormValues = z.infer<ReturnType<typeof makeJoinTournamentSchema>>;
