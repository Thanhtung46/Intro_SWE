import { z } from 'zod';
import { GENDERS } from '../../../shared/constants/auth.js';

const phoneRegex = /^\+?[0-9]{10,15}$/;

export const registerSchema = z
  .object({
    fullName: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(1, 'Name is required')
      .max(100, 'Name must be at most 100 characters'),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Email is invalid')
      .max(150, 'Email must be at most 150 characters'),
    phoneNumber: z
      .string({ required_error: 'Phone number is required' })
      .trim()
      .regex(phoneRegex, 'Phone number must be 10–15 digits (optional leading +)'),
    gender: z.enum(GENDERS, {
      errorMap: () => ({
        message: 'Gender must be one of: male, female, other, prefer_not_to_say',
      }),
    }),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one digit'),
    confirmPassword: z.string({
      required_error: 'Confirm password is required',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Password and confirm password do not match',
    path: ['confirmPassword'],
  });

export function parseRegisterDto(body) {
  return registerSchema.parse(body);
}
