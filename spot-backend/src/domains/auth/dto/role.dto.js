import { z } from 'zod';
import { SELECTABLE_ROLES } from '../../../shared/constants/auth.js';

export const selectRoleSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Email is invalid')
    .max(150, 'Email must be at most 150 characters'),
  role: z.enum(SELECTABLE_ROLES, {
    errorMap: () => ({
      message: `Role must be one of: ${SELECTABLE_ROLES.join(', ')}`,
    }),
  }),
});

export function parseSelectRoleDto(body) {
  return selectRoleSchema.parse(body);
}
