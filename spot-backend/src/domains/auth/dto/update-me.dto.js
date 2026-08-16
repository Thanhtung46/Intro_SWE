import { z } from 'zod';
import {
  BADMINTON_SKILL_CODES,
  FOOTBALL_SKILL_CODES,
} from '../../../shared/constants/sports.js';
import { optionalHttpUrl } from '../../../shared/validation/httpUrl.js';

function optionalSkill(codes, sportLabel) {
  return z
    .union([z.string(), z.null()])
    .optional()
    .superRefine((value, ctx) => {
      if (value === undefined || value === null) {
        return;
      }
      if (!codes.includes(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${sportLabel} skill must be one of: ${codes.join(', ')}`,
        });
      }
    });
}

export const updateMeSchema = z
  .object({
    skills: z
      .object({
        badminton: optionalSkill(BADMINTON_SKILL_CODES, 'Badminton'),
        football: optionalSkill(FOOTBALL_SKILL_CODES, 'Football'),
      })
      .strict()
      .refine(
        (skills) =>
          skills.badminton !== undefined || skills.football !== undefined,
        {
          message: 'Provide at least one of badminton or football',
        },
      )
      .optional(),
    avatarUrl: optionalHttpUrl('avatarUrl'),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.skills === undefined && data.avatarUrl === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide skills and/or avatarUrl',
      });
    }
  });

export function parseUpdateMeDto(body) {
  return updateMeSchema.parse(body);
}
