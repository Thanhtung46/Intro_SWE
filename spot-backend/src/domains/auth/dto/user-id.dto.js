import { z } from 'zod';
import { PG_INT4_MAX } from '../../../shared/constants/auth.js';

export const userIdParamSchema = z.object({
  id: z.coerce
    .number({ invalid_type_error: 'Invalid user id' })
    .int('Invalid user id')
    .min(1, 'Invalid user id')
    .max(PG_INT4_MAX, 'Invalid user id'),
});

export function parseUserIdParam(params) {
  return userIdParamSchema.parse(params).id;
}
