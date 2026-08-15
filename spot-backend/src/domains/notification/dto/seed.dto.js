import { z } from 'zod';
import { NOTIFICATION_TYPES } from '../../../shared/constants/notification.js';

const types = Object.values(NOTIFICATION_TYPES);

export const seedNotificationSchema = z.object({
  type: z.enum(types).optional().default(NOTIFICATION_TYPES.SYSTEM),
  title: z.string().trim().min(1).max(200).optional().default('Test notification'),
  body: z
    .string()
    .trim()
    .min(1)
    .max(2000)
    .optional()
    .default('This is a seeded inbox notification.'),
  data: z.record(z.unknown()).optional().default({}),
  bookingId: z.number().int().positive().optional(),
  startAt: z.coerce.date().optional(),
  /** When true, also schedule T-24h / T-2h reminders (needs startAt). */
  scheduleReminders: z.boolean().optional().default(false),
  /** Smoke helper: insert a PENDING reminder with fire_at in the past. */
  dueReminderNow: z.boolean().optional().default(false),
});

export function parseSeedNotificationDto(body) {
  return seedNotificationSchema.parse(body ?? {});
}
