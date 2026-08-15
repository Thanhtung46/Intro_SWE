import { z } from 'zod';

const emailField = z
  .string({ required_error: 'New email is required' })
  .trim()
  .email('Email is invalid')
  .max(150, 'Email must be at most 150 characters');

export const requestEmailChangeSchema = z.object({
  newEmail: emailField,
});

export const confirmEmailChangeSchema = z.object({
  newEmail: emailField,
  otp: z
    .string({ required_error: 'OTP is required' })
    .trim()
    .regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
});

export function parseRequestEmailChangeDto(body) {
  return requestEmailChangeSchema.parse(body);
}

export function parseConfirmEmailChangeDto(body) {
  return confirmEmailChangeSchema.parse(body);
}
