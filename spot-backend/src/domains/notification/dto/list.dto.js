import { z } from 'zod';

export const listNotificationsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  beforeId: z.coerce.number().int().positive().optional(),
  unreadOnly: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
    .optional()
    .transform((v) => {
      if (v === undefined) return false;
      if (typeof v === 'boolean') return v;
      return v === 'true' || v === '1';
    }),
});

export function parseListNotificationsDto(query) {
  return listNotificationsSchema.parse(query);
}
