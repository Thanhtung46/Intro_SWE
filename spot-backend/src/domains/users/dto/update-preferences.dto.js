import { z } from 'zod';
import { LANGUAGES, APPEARANCES } from '../../../shared/constants/auth.js';

/** Settings prefs (SPOT-195) — Preference + Layout on Figma Settings. */
export const updatePreferencesSchema = z
  .object({
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
      data.language !== undefined ||
      data.appearance !== undefined ||
      data.pushNotificationsEnabled !== undefined ||
      data.locationServicesEnabled !== undefined,
    {
      message: 'At least one preference field is required',
      path: ['language'],
    },
  );

export function parseUpdatePreferencesDto(body) {
  return updatePreferencesSchema.parse(body);
}
