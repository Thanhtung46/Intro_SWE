import { z } from 'zod';

const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit');

export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Email is invalid')
    .max(150, 'Email must be at most 150 characters'),
});

export const resetPasswordSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Email is invalid')
      .max(150, 'Email must be at most 150 characters'),
    otp: z
      .string({ required_error: 'OTP is required' })
      .trim()
      .regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
    newPassword: passwordSchema,
    confirmPassword: z.string({
      required_error: 'Confirm password is required',
    }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Password and confirm password do not match',
    path: ['confirmPassword'],
  });

export function parseForgotPasswordDto(body) {
  return forgotPasswordSchema.parse(body);
}

export function parseResetPasswordDto(body) {
  return resetPasswordSchema.parse(body);
}
