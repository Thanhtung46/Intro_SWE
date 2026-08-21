import { z } from 'zod';
import { optionalHttpUrl } from '../../../shared/validation/httpUrl.js';
import { isVnCityInProvince } from '../../../shared/constants/vn-admin.js';

const isoDateSchema = z
  .string()
  .datetime({ offset: true, message: 'Must be an ISO-8601 datetime with offset' });

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

const playerRankSchema = z.object({
  rosterPlayerId: z
    .number({ required_error: 'rosterPlayerId is required' })
    .int('rosterPlayerId must be an integer')
    .min(1, 'rosterPlayerId must be at least 1'),
  rank: z
    .number()
    .int('rank must be an integer')
    .min(1, 'rank must be at least 1')
    .nullable(),
});

export const updateTournamentSchema = z
  .object({
    title: z.string().trim().min(1).max(150).optional(),
    coverUrl: optionalHttpUrl('coverUrl'),
    description: z.string().trim().min(1).max(10000).optional(),
    venueName: z.string().trim().min(1).max(255).optional(),
    venueAddress: z.string().trim().min(1).max(500).optional(),
    province: z.string().trim().min(1).max(5).optional(),
    city: z.string().trim().min(1).max(5).optional(),
    latitude: z.number().gte(-90).lte(90).optional(),
    longitude: z.number().gte(-180).lte(180).optional(),
    startsAt: isoDateSchema.optional(),
    endsAt: isoDateSchema.optional(),
    registrationDeadline: isoDateSchema.optional(),
    registrationFeeVnd: z
      .number()
      .int('registrationFeeVnd must be an integer')
      .min(0, 'registrationFeeVnd must be >= 0')
      .optional(),
    prizePoolVnd: z
      .number()
      .int('prizePoolVnd must be an integer')
      .min(0, 'prizePoolVnd must be >= 0')
      .optional(),
    winners: z.array(winnerEntrySchema).max(10).nullish(),
    playerRanks: z.array(playerRankSchema).max(512).optional(),
  })
  .superRefine((data, ctx) => {
    const keys = Object.keys(data).filter((key) => data[key] !== undefined);
    if (!keys.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one field is required',
      });
    }

    const hasLat = data.latitude !== undefined;
    const hasLng = data.longitude !== undefined;
    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: hasLat ? ['longitude'] : ['latitude'],
        message: 'latitude and longitude must be sent together',
      });
    }

    if (data.province && data.city && !isVnCityInProvince(data.province, data.city)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['city'],
        message: 'city must belong to province (pre-2025 tỉnh / quận-huyện codes)',
      });
    }
    if (data.city && !data.province) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['province'],
        message: 'province is required when updating city',
      });
    }

    if (data.startsAt && data.endsAt) {
      if (Date.parse(data.endsAt) < Date.parse(data.startsAt)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endsAt'],
          message: 'endsAt must be on or after startsAt',
        });
      }
    }
    if (data.startsAt && data.registrationDeadline) {
      if (Date.parse(data.registrationDeadline) > Date.parse(data.startsAt)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['registrationDeadline'],
          message: 'registrationDeadline must be on or before startsAt',
        });
      }
    }

    if (data.winners?.length) {
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
    }

    if (data.playerRanks?.length) {
      const ids = data.playerRanks.map((entry) => entry.rosterPlayerId);
      if (new Set(ids).size !== ids.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['playerRanks'],
          message: 'playerRanks rosterPlayerId values must be unique',
        });
      }
    }
  });

export function parseUpdateTournamentDto(body) {
  return updateTournamentSchema.parse(body ?? {});
}
