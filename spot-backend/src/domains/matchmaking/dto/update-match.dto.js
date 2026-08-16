import { z } from 'zod';
import { SPORT_CODES } from '../../../shared/constants/sports.js';
import {
  FEE_TYPE_CODES,
  JOIN_MODE_CODES,
  MATCH_FORMATS,
} from '../../../shared/constants/matchmaking.js';
import { optionalHttpUrl } from '../../../shared/validation/httpUrl.js';

const courtSchema = z.object({
  name: z
    .string({ required_error: 'Court name is required' })
    .trim()
    .min(1, 'Court name is required')
    .max(80, 'Court name must be at most 80 characters'),
});

export const updateMatchSchema = z
  .object({
    sport: z.enum(SPORT_CODES).optional(),
    format: z.enum(MATCH_FORMATS).optional(),
    title: z.string().trim().min(1).max(150).optional(),
    notes: z.string().trim().max(2000).nullish(),
    coverUrl: optionalHttpUrl('coverUrl'),
    venueName: z.string().trim().min(1).max(255).optional(),
    venueAddress: z.string().trim().min(1).max(500).optional(),
    latitude: z.number().gte(-90).lte(90).nullish(),
    longitude: z.number().gte(-180).lte(180).nullish(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    isMultiDay: z.boolean().optional(),
    isRecurring: z.boolean().optional(),
    maxPlayers: z.number().int().min(2).max(40).optional(),
    allLevels: z.boolean().optional(),
    skillMin: z.string().optional(),
    skillMax: z.string().optional(),
    feeType: z.enum(FEE_TYPE_CODES).optional(),
    priceMin: z.number().int().min(0).optional(),
    priceMax: z.number().int().min(0).optional(),
    joinMode: z.enum(JOIN_MODE_CODES).optional(),
    courtCount: z.number().int().min(1).max(20).optional(),
    courts: z.array(courtSchema).min(1).max(20).optional(),
  })
  .superRefine((data, ctx) => {
    const keys = Object.keys(data).filter((key) => data[key] !== undefined);
    if (!keys.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one field is required',
      });
    }

    const hasLat = data.latitude != null;
    const hasLng = data.longitude != null;
    if (
      data.latitude !== undefined &&
      data.longitude !== undefined &&
      hasLat !== hasLng
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: hasLat ? ['longitude'] : ['latitude'],
        message: 'latitude and longitude must be sent together',
      });
    }

    if (data.courts) {
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

export function parseUpdateMatchDto(body) {
  return updateMatchSchema.parse(body ?? {});
}
