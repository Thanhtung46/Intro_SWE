import { z } from 'zod';
import {
  GENDERS,
  LANGUAGES,
  APPEARANCES,
} from '../../../shared/constants/auth.js';

const httpUrl = z
  .string()
  .trim()
  .url('avatarUrl must be a valid URL')
  .refine(
    (value) => /^https?:\/\//i.test(value),
    'avatarUrl must be an http or https URL',
  );

export const updateProfileSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, 'Name is required')
      .max(100, 'Name must be at most 100 characters')
      .optional(),
    gender: z
      .enum(GENDERS, {
        errorMap: () => ({
          message:
            'Gender must be one of: male, female, other, prefer_not_to_say',
        }),
      })
      .optional(),
    avatarUrl: z.union([httpUrl, z.null()]).optional(),
    language: z
      .enum(LANGUAGES, {
        errorMap: () => ({
          message: 'Language must be one of: en, vi',
        }),
      })
      .optional(),
    appearance: z
      .enum(APPEARANCES, {
        errorMap: () => ({
          message: 'Appearance must be one of: light, dark, system',
        }),
      })
      .optional(),
    pushNotificationsEnabled: z.boolean().optional(),
    locationServicesEnabled: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.fullName !== undefined ||
      data.gender !== undefined ||
      data.avatarUrl !== undefined ||
      data.language !== undefined ||
      data.appearance !== undefined ||
      data.pushNotificationsEnabled !== undefined ||
      data.locationServicesEnabled !== undefined,
    {
      message: 'At least one profile field is required',
      path: ['fullName'],
    },
  );

export function parseUpdateProfileDto(body) {
  return updateProfileSchema.parse(body);
}
