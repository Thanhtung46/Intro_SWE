import { z } from 'zod';
import {
  SCHEDULE_ITEM_TYPES,
  SCHEDULE_DEFAULT_LIMIT,
  SCHEDULE_MAX_LIMIT,
} from '../../../shared/constants/schedule.js';

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const listScheduleSchema = z
  .object({
    type: z
      .enum([
        SCHEDULE_ITEM_TYPES.ALL,
        SCHEDULE_ITEM_TYPES.BOOKING,
        SCHEDULE_ITEM_TYPES.MATCH,
      ])
      .optional()
      .default(SCHEDULE_ITEM_TYPES.ALL),
    from: dateString.optional(),
    to: dateString.optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(SCHEDULE_MAX_LIMIT)
      .optional()
      .default(SCHEDULE_DEFAULT_LIMIT),
  })
  .superRefine((val, ctx) => {
    if (val.from && val.to && val.from > val.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '`from` must be on or before `to`',
        path: ['from'],
      });
    }
  });

export function parseListScheduleDto(query) {
  return listScheduleSchema.parse(query);
}

export const seedScheduleSchema = z
  .object({
    includeMatch: z.boolean().optional().default(true),
    daysFromNow: z.coerce.number().int().min(0).max(60).optional().default(3),
  })
  .strict();

export function parseSeedScheduleDto(body) {
  return seedScheduleSchema.parse(body ?? {});
}
