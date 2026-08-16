import { z } from 'zod';
import { SPORT_CODES, isSkillForSport, rankForSkill } from '../../../shared/constants/sports.js';
import {
  FEE_TYPES,
  FEE_TYPE_CODES,
  JOIN_MODE_CODES,
  MATCH_FORMATS,
  MATCH_MIN_DURATION_MINUTES,
  isFormatForSport,
} from '../../../shared/constants/matchmaking.js';
import { optionalHttpUrl } from '../../../shared/validation/httpUrl.js';

const courtSchema = z.object({
  name: z
    .string({ required_error: 'Court name is required' })
    .trim()
    .min(1, 'Court name is required')
    .max(80, 'Court name must be at most 80 characters'),
});

export const createMatchSchema = z
  .object({
    sport: z.enum(SPORT_CODES, {
      errorMap: () => ({
        message: `Sport must be one of: ${SPORT_CODES.join(', ')}`,
      }),
    }),
    format: z.enum(MATCH_FORMATS, {
      errorMap: () => ({
        message: `Format must be one of: ${MATCH_FORMATS.join(', ')}`,
      }),
    }),
    title: z
      .string({ required_error: 'Title is required' })
      .trim()
      .min(1, 'Title is required')
      .max(150, 'Title must be at most 150 characters'),
    notes: z
      .string()
      .trim()
      .max(2000, 'Notes must be at most 2000 characters')
      .nullish(),
    coverUrl: optionalHttpUrl('coverUrl'),
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
    latitude: z
      .number({ invalid_type_error: 'latitude must be a number' })
      .gte(-90, 'latitude must be >= -90')
      .lte(90, 'latitude must be <= 90')
      .nullish(),
    longitude: z
      .number({ invalid_type_error: 'longitude must be a number' })
      .gte(-180, 'longitude must be >= -180')
      .lte(180, 'longitude must be <= 180')
      .nullish(),
    startsAt: z.coerce.date({
      required_error: 'startsAt is required',
      invalid_type_error: 'startsAt must be a valid datetime',
    }),
    endsAt: z.coerce.date({
      required_error: 'endsAt is required',
      invalid_type_error: 'endsAt must be a valid datetime',
    }),
    isMultiDay: z.boolean().optional().default(false),
    isRecurring: z.boolean().optional().default(false),
    maxPlayers: z
      .number({ required_error: 'maxPlayers is required' })
      .int('maxPlayers must be an integer')
      .min(2, 'maxPlayers must be at least 2')
      .max(40, 'maxPlayers must be at most 40'),
    allLevels: z.boolean().optional().default(false),
    skillMin: z.string().optional(),
    skillMax: z.string().optional(),
    feeType: z.enum(FEE_TYPE_CODES, {
      errorMap: () => ({
        message: `feeType must be one of: ${FEE_TYPE_CODES.join(', ')}`,
      }),
    }),
    priceMin: z
      .number()
      .int('priceMin must be an integer')
      .min(0, 'priceMin must be >= 0')
      .optional(),
    priceMax: z
      .number()
      .int('priceMax must be an integer')
      .min(0, 'priceMax must be >= 0')
      .optional(),
    joinMode: z.enum(JOIN_MODE_CODES, {
      errorMap: () => ({
        message: `joinMode must be one of: ${JOIN_MODE_CODES.join(', ')}`,
      }),
    }),
    courtCount: z
      .number()
      .int('courtCount must be an integer')
      .min(1, 'courtCount must be at least 1')
      .max(20, 'courtCount must be at most 20')
      .optional(),
    courts: z
      .array(courtSchema, { required_error: 'courts is required' })
      .min(1, 'At least one named court is required')
      .max(20, 'courts must have at most 20 items'),
  })
  .superRefine((data, ctx) => {
    if (!isFormatForSport(data.sport, data.format)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['format'],
        message: `Format ${data.format} is not valid for ${data.sport}`,
      });
    }

    const hasLat = data.latitude != null;
    const hasLng = data.longitude != null;
    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: hasLat ? ['longitude'] : ['latitude'],
        message: 'latitude and longitude must be sent together',
      });
    }

    if (data.endsAt <= data.startsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endsAt'],
        message: 'endsAt must be after startsAt',
      });
    } else {
      const durationMs = data.endsAt.getTime() - data.startsAt.getTime();
      const minMs = MATCH_MIN_DURATION_MINUTES * 60 * 1000;
      if (durationMs < minMs) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endsAt'],
          message: `Match must last at least ${MATCH_MIN_DURATION_MINUTES} minutes`,
        });
      }
    }

    const skewMs = 60 * 1000;
    if (data.startsAt.getTime() < Date.now() - skewMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startsAt'],
        message: 'startsAt must be in the future',
      });
    }

    if (!data.allLevels) {
      if (!data.skillMin) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['skillMin'],
          message: 'skillMin is required unless allLevels is true',
        });
      } else if (!isSkillForSport(data.sport, data.skillMin)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['skillMin'],
          message: `skillMin is not valid for ${data.sport}`,
        });
      }
      if (!data.skillMax) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['skillMax'],
          message: 'skillMax is required unless allLevels is true',
        });
      } else if (!isSkillForSport(data.sport, data.skillMax)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['skillMax'],
          message: `skillMax is not valid for ${data.sport}`,
        });
      }
      const minRank = rankForSkill(data.sport, data.skillMin);
      const maxRank = rankForSkill(data.sport, data.skillMax);
      if (minRank != null && maxRank != null && minRank > maxRank) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['skillMax'],
          message: 'skillMax must be greater than or equal to skillMin',
        });
      }
    }

    if (data.feeType === FEE_TYPES.GENDER_RANGE) {
      if (data.priceMin == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['priceMin'],
          message: 'priceMin is required when feeType is GENDER_RANGE (female)',
        });
      }
      if (data.priceMax == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['priceMax'],
          message: 'priceMax is required when feeType is GENDER_RANGE (male)',
        });
      }
      if (
        data.priceMin != null &&
        data.priceMax != null &&
        data.priceMax < data.priceMin
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['priceMax'],
          message: 'priceMax must be greater than or equal to priceMin',
        });
      }
    } else if (data.feeType === FEE_TYPES.SPLIT_EVENLY) {
      if (data.priceMax != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['priceMax'],
          message: 'priceMax must be omitted when feeType is SPLIT_EVENLY',
        });
      }
      if (data.priceMin == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['priceMin'],
          message: 'priceMin is the total to split when feeType is SPLIT_EVENLY',
        });
      } else if (data.priceMin < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['priceMin'],
          message: 'priceMin must be at least 1 when feeType is SPLIT_EVENLY',
        });
      }
    }

    if (!data.courts?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['courts'],
        message: 'courts is required and each court must have a name (e.g. "1", "Court 1")',
      });
    } else {
      if (data.courtCount != null && data.courts.length !== data.courtCount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['courts'],
          message: 'courts.length must equal courtCount',
        });
      }
      const names = data.courts.map((court) => court.name.trim().toLowerCase());
      if (new Set(names).size !== names.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['courts'],
          message: 'Court names on one match must be unique',
        });
      }
    }
  });

export function parseCreateMatchDto(body) {
  return createMatchSchema.parse(body);
}
