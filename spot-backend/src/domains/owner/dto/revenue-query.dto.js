import { z } from 'zod';
import { SPORT_TYPES } from '../../../shared/constants/venue.js';
import { REVENUE_GRANULARITIES } from '../../../shared/constants/owner.js';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const sportValues = Object.values(SPORT_TYPES);

export const revenuePeriodSchema = z.object({
  from: z.string().regex(dateRegex),
  to: z.string().regex(dateRegex),
  sport: z.enum(sportValues).optional(),
  venueId: z.coerce.number().int().positive().optional(),
});

export function parseRevenuePeriodDto(query) {
  const parsed = revenuePeriodSchema.parse(query ?? {});
  if (parsed.from > parsed.to) {
    throw new z.ZodError([
      {
        code: 'custom',
        message: 'from must be on or before to',
        path: ['from'],
      },
    ]);
  }
  return parsed;
}

export const revenueTimeseriesSchema = revenuePeriodSchema.extend({
  granularity: z
    .enum([REVENUE_GRANULARITIES.WEEK, REVENUE_GRANULARITIES.MONTH])
    .optional()
    .default(REVENUE_GRANULARITIES.MONTH),
});

export function parseRevenueTimeseriesDto(query) {
  const parsed = revenueTimeseriesSchema.parse(query ?? {});
  if (parsed.from > parsed.to) {
    throw new z.ZodError([
      {
        code: 'custom',
        message: 'from must be on or before to',
        path: ['from'],
      },
    ]);
  }
  return parsed;
}

export const revenueExportSchema = revenuePeriodSchema.extend({
  format: z.enum(['csv']).optional().default('csv'),
});

export function parseRevenueExportDto(query) {
  const parsed = revenueExportSchema.parse(query ?? {});
  if (parsed.from > parsed.to) {
    throw new z.ZodError([
      {
        code: 'custom',
        message: 'from must be on or before to',
        path: ['from'],
      },
    ]);
  }
  return parsed;
}
