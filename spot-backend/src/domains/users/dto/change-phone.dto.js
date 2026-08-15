import { z } from 'zod';

const phoneRegex = /^0(2|3|5|7|8|9)[0-9]{8}$/;

const phoneField = z
  .string({ required_error: 'New phone number is required' })
  .trim()
  .regex(
    phoneRegex,
    'Phone number must be a valid Vietnamese number (10 digits, starting with 02, 03, 05, 07, 08, or 09)',
  );

export const requestPhoneChangeSchema = z.object({
  newPhone: phoneField,
});

export const confirmPhoneChangeSchema = z.object({
  newPhone: phoneField,
  otp: z
    .string({ required_error: 'OTP is required' })
    .trim()
    .regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
});

export function parseRequestPhoneChangeDto(body) {
  return requestPhoneChangeSchema.parse(body);
}

export function parseConfirmPhoneChangeDto(body) {
  return confirmPhoneChangeSchema.parse(body);
}
