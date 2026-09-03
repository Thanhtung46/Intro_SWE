import { z } from 'zod';
import { normalizeSportType } from '../../../shared/constants/venue.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const listVenuesQuerySchema = z
  .object({
    sport: z.string().min(1),
    location: z.string().trim().min(1).max(200).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    long: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().positive().optional(),
    province: z.string().min(1).optional(),
    city: z.string().min(1).optional(),
    priceMin: z.coerce.number().min(0).optional(),
    priceMax: z.coerce.number().min(0).optional(),
    date: z.string().regex(DATE_RE, 'date must be YYYY-MM-DD').optional(),
    timeFrom: z.string().regex(TIME_RE, 'timeFrom must be HH:mm').optional(),
    timeTo: z.string().regex(TIME_RE, 'timeTo must be HH:mm').optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (!normalizeSportType(val.sport)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'sport must be one of: football, badminton',
        path: ['sport'],
      });
    }

    const hasLat = val.lat !== undefined;
    const hasLong = val.long !== undefined;
    if (hasLat !== hasLong) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'lat and long must be given together',
        path: hasLat ? ['long'] : ['lat'],
      });
    }

    if (val.location && hasLat && hasLong) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Use location or distance, not both',
        path: ['location'],
      });
    }

    if (val.city && !val.province) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'city requires province',
        path: ['city'],
      });
    }

    if (
      val.priceMin !== undefined &&
      val.priceMax !== undefined &&
      val.priceMax < val.priceMin
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'priceMax must be >= priceMin',
        path: ['priceMax'],
      });
    }

    if ((val.timeFrom || val.timeTo) && !val.date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'date is required when filtering by timeFrom/timeTo',
        path: ['date'],
      });
    }

    if (val.timeFrom && val.timeTo && val.timeTo <= val.timeFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'timeTo must be after timeFrom',
        path: ['timeTo'],
      });
    }
  })
  .transform((val) => ({
    sport: val.sport,
    location: val.location,
    lat: val.lat,
    long: val.long,
    radiusKm: val.lat !== undefined ? (val.radiusKm ?? 20) : undefined,
    province: val.province,
    city: val.city,
    priceMin: val.priceMin,
    priceMax: val.priceMax,
    date: val.date,
    timeFrom: val.timeFrom,
    timeTo: val.timeTo,
  }));

export function parseListVenuesQuery(query) {
  return listVenuesQuerySchema.parse(query ?? {});
}
