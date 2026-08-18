import { z } from 'zod';
import { SCHEDULE_TIMEZONE } from '../../../shared/constants/schedule.js';

/** { date: 'YYYY-MM-DD', time: 'HH:MM' } for "now" in Asia/Bangkok. */
function nowInZoneParts() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: SCHEDULE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export const createBookingSchema = z
  .object({
    fieldId: z.coerce.number().int().positive(),
    bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'bookingDate must be YYYY-MM-DD'),
    startTime: z.string().regex(TIME_REGEX, 'startTime must be HH:mm'),
    endTime: z.string().regex(TIME_REGEX, 'endTime must be HH:mm'),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.endTime <= val.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'endTime must be after startTime',
        path: ['endTime'],
      });
    }

    const now = nowInZoneParts();
    const isPast =
      val.bookingDate < now.date ||
      (val.bookingDate === now.date && val.startTime <= now.time);
    if (isPast) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'bookingDate/startTime must not be in the past',
        path: ['bookingDate'],
      });
    }
  });

export function parseCreateBookingDto(body) {
  return createBookingSchema.parse(body ?? {});
}
