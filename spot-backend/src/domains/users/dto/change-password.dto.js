import { z } from 'zod';

const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(
    /[^A-Za-z0-9]/,
    'Password must contain at least one special character',
  );

export const changePasswordSchema = z
  .object({
    currentPassword: z.string({
      required_error: 'Current password is required',
    }),
    newPassword: passwordSchema,
    confirmPassword: z.string({
      required_error: 'Confirm password is required',
    }),
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Password and confirm password do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

export function parseChangePasswordDto(body) {
  return changePasswordSchema.parse(body);
}
