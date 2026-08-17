import { z } from 'zod';
import {
  BULK_CREATE,
  MATCH_MIN_DURATION_MINUTES,
} from '../../../shared/constants/matchmaking.js';
import { parseCreateMatchDto } from './create-match.dto.js';

const scheduleSchema = z
  .object({
    startsAt: z.coerce.date({
      required_error: 'startsAt is required',
      invalid_type_error: 'startsAt must be a valid datetime',
    }),
    endsAt: z.coerce.date({
      required_error: 'endsAt is required',
      invalid_type_error: 'endsAt must be a valid datetime',
    }),
  })
  .superRefine((data, ctx) => {
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
  });

const bulkBodySchema = z.object({
  template: z.record(z.unknown()),
  schedules: z
    .array(scheduleSchema)
    .min(1, 'At least one schedule is required')
    .max(
      BULK_CREATE.MAX_SCHEDULES,
      `At most ${BULK_CREATE.MAX_SCHEDULES} schedules allowed`,
    ),
});

export function parseCreateMatchBulkDto(body) {
  const parsed = bulkBodySchema.parse(body);
  const template = { ...parsed.template, isMultiDay: false };

  for (const schedule of parsed.schedules) {
    parseCreateMatchDto({
      ...template,
      ...schedule,
      isMultiDay: false,
    });
  }

  return {
    template,
    schedules: parsed.schedules,
  };
}
