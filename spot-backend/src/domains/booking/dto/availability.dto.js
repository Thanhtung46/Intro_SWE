import { z } from 'zod';
import { SCHEDULE_TIMEZONE } from '../../../shared/constants/schedule.js';

function todayInZone() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SCHEDULE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export const fieldAvailabilityQuerySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.date < todayInZone()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'date must not be in the past',
        path: ['date'],
      });
    }
  });

export function parseFieldAvailabilityQuery(query) {
  return fieldAvailabilityQuerySchema.parse(query ?? {});
}
