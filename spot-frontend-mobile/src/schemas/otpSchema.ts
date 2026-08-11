import { z } from 'zod';

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'OTP must be exactly 6 digits');

export function parseOtp(value: string) {
  return otpSchema.safeParse(value);
}
