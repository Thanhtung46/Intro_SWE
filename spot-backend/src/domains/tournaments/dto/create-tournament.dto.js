import { z } from 'zod';
import { SPORT_CODES } from '../../../shared/constants/sports.js';
import { SPORTS } from '../../../shared/constants/sports.js';
import {
  FOOTBALL_TOURNAMENT_FORMATS,
  BADMINTON_TOURNAMENT_FORMATS,
  GENDER_DIVISION_CODES,
} from '../../../shared/constants/tournaments.js';
import { requiredHttpUrl } from '../../../shared/validation/httpUrl.js';
import { isVnCityInProvince } from '../../../shared/constants/vn-admin.js';

const isoDateSchema = z
  .string({ required_error: 'ISO datetime is required' })
  .datetime({ offset: true, message: 'Must be an ISO-8601 datetime with offset' });

export const createTournamentSchema = z
  .object({
    sport: z.enum(SPORT_CODES, {
      errorMap: () => ({
        message: `Sport must be one of: ${SPORT_CODES.join(', ')}`,
      }),
    }),
    format: z.string({ required_error: 'format is required' }),
    genderDivision: z
      .enum(GENDER_DIVISION_CODES, {
        errorMap: () => ({
          message: `genderDivision must be one of: ${GENDER_DIVISION_CODES.join(', ')}`,
        }),
      })
      .nullish(),
    title: z
      .string({ required_error: 'title is required' })
      .trim()
      .min(1, 'title is required')
      .max(150, 'title must be at most 150 characters'),
    coverUrl: requiredHttpUrl('coverUrl'),
    description: z
      .string({ required_error: 'description is required' })
      .trim()
      .min(1, 'description is required')
      .max(10000, 'description must be at most 10000 characters'),
    venueName: z
      .string({ required_error: 'venueName is required' })
      .trim()
      .min(1, 'venueName is required')
      .max(255, 'venueName must be at most 255 characters'),
    venueAddress: z
      .string({ required_error: 'venueAddress is required' })
      .trim()
      .min(1, 'venueAddress is required')
      .max(500, 'venueAddress must be at most 500 characters'),
    province: z
      .string({ required_error: 'province is required' })
      .trim()
      .min(1, 'province is required')
      .max(5, 'province must be at most 5 characters'),
    city: z
      .string({ required_error: 'city is required' })
      .trim()
      .min(1, 'city is required')
      .max(5, 'city must be at most 5 characters'),
    latitude: z
      .number({ required_error: 'latitude is required' })
      .gte(-90, 'latitude must be >= -90')
      .lte(90, 'latitude must be <= 90'),
    longitude: z
      .number({ required_error: 'longitude is required' })
      .gte(-180, 'longitude must be >= -180')
      .lte(180, 'longitude must be <= 180'),
    startsAt: isoDateSchema,
    endsAt: isoDateSchema,
    registrationDeadline: isoDateSchema,
    maxTeams: z
      .number({ required_error: 'maxTeams is required' })
      .int('maxTeams must be an integer')
      .min(2, 'maxTeams must be at least 2')
      .max(128, 'maxTeams must be at most 128'),
    registrationFeeVnd: z
      .number({ required_error: 'registrationFeeVnd is required' })
      .int('registrationFeeVnd must be an integer')
      .min(0, 'registrationFeeVnd must be >= 0'),
    prizePoolVnd: z
      .number({ required_error: 'prizePoolVnd is required' })
      .int('prizePoolVnd must be an integer')
      .min(0, 'prizePoolVnd must be >= 0'),
  })
  .superRefine((data, ctx) => {
    if (!isVnCityInProvince(data.province, data.city)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['city'],
        message: 'city must belong to province (pre-2025 tỉnh / quận-huyện codes)',
      });
    }

    const startsAt = Date.parse(data.startsAt);
    const endsAt = Date.parse(data.endsAt);
    const registrationDeadline = Date.parse(data.registrationDeadline);
    if (Number.isFinite(startsAt) && Number.isFinite(endsAt) && endsAt < startsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endsAt'],
        message: 'endsAt must be on or after startsAt',
      });
    }
    if (
      Number.isFinite(startsAt) &&
      Number.isFinite(registrationDeadline) &&
      registrationDeadline > startsAt
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['registrationDeadline'],
        message: 'registrationDeadline must be on or before startsAt',
      });
    }
    if (Number.isFinite(startsAt) && startsAt <= Date.now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startsAt'],
        message: 'startsAt must be in the future',
      });
    }

    if (data.sport === SPORTS.FOOTBALL) {
      if (!FOOTBALL_TOURNAMENT_FORMATS.includes(data.format)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['format'],
          message: `format must be one of: ${FOOTBALL_TOURNAMENT_FORMATS.join(', ')}`,
        });
      }
      if (!data.genderDivision) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['genderDivision'],
          message: 'genderDivision is required for football tournaments',
        });
      }
    }

    if (data.sport === SPORTS.BADMINTON) {
      if (!BADMINTON_TOURNAMENT_FORMATS.includes(data.format)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['format'],
          message: `format must be one of: ${BADMINTON_TOURNAMENT_FORMATS.join(', ')}`,
        });
      }
      if (data.genderDivision != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['genderDivision'],
          message: 'genderDivision must be omitted for badminton tournaments',
        });
      }
    }
  });

export function parseCreateTournamentDto(body) {
  return createTournamentSchema.parse(body);
}
