import { z } from 'zod';
import type { TranslationKey } from '@/i18n/translations';

export function getGenderOptions(
  t: (key: TranslationKey) => string,
): { label: string; value: 'male' | 'female' }[] {
  return [
    { label: t('common.male'), value: 'male' },
    { label: t('common.female'), value: 'female' },
  ];
}

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
    phone: z.string().trim().optional().or(z.literal('')),
    gender: z.enum(['male', 'female']).optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must include an uppercase letter')
      .regex(/[a-z]/, 'Password must include a lowercase letter')
      .regex(/[0-9]/, 'Password must include a number')
      .regex(/[^A-Za-z0-9]/, 'Password must include a special character'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
export type RegisterFieldErrors = Partial<Record<keyof RegisterFormValues, string>>;
