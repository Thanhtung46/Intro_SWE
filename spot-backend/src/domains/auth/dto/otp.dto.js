import { z } from 'zod';
import { OTP_PURPOSES } from '../../../shared/constants/auth.js';

const purposeValues = Object.values(OTP_PURPOSES);

const emailField = z
  .string({ required_error: 'Email is required' })
  .trim()
  .email('Email is invalid')
  .max(150, 'Email must be at most 150 characters');

const purposeField = z
  .enum(purposeValues, {
    errorMap: () => ({
      message: `Purpose must be one of: ${purposeValues.join(', ')}`,
    }),
  })
  .default(OTP_PURPOSES.REGISTER);

export const verifyOtpSchema = z.object({
  email: emailField,
  otp: z
    .string({ required_error: 'OTP is required' })
    .trim()
    .regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
  purpose: purposeField,
});

export const resendOtpSchema = z.object({
  email: emailField,
  purpose: purposeField,
});

export function parseVerifyOtpDto(body) {
  return verifyOtpSchema.parse(body);
}

export function parseResendOtpDto(body) {
  return resendOtpSchema.parse(body);
}
