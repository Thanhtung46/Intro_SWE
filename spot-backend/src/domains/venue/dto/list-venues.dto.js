import { z } from 'zod';
import { normalizeSportType } from '../../../shared/constants/venue.js';

export const listVenuesQuerySchema = z
  .object({
    sport: z.string().min(1),
    lat: z.coerce.number().min(-90).max(90).optional(),
    long: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().positive().optional(),
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
  })
  .transform((val) => ({
    sport: val.sport,
    lat: val.lat,
    long: val.long,
    radiusKm: val.lat !== undefined ? (val.radiusKm ?? 20) : undefined,
  }));

export function parseListVenuesQuery(query) {
  return listVenuesQuerySchema.parse(query ?? {});
}
