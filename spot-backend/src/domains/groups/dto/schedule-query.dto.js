import { z } from 'zod';

const blankToUndefined = (value) =>
  value === '' || value === undefined || value === null ? undefined : value;

export const groupScheduleQuerySchema = z.object({
  date: z.preprocess(
    blankToUndefined,
    z
      .string({ required_error: 'date is required' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  ),
});

export function parseGroupScheduleQuery(query) {
  return groupScheduleQuerySchema.parse(query);
}
