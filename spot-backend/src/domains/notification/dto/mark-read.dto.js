import { z } from 'zod';

export const notificationIdParamSchema = z.object({
  id: z.coerce.number().int().positive({
    message: 'Notification id must be a positive integer',
  }),
});

export function parseNotificationIdParam(params) {
  return notificationIdParamSchema.parse(params);
}
