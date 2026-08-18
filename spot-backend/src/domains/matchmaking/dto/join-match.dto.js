import { z, ZodError } from 'zod';
import { isSkillForSport } from '../../../shared/constants/sports.js';
import { FEE_GENDERS } from '../../../shared/constants/matchmaking.js';
import {
  VN_PHONE_MESSAGE,
  VN_PHONE_REGEX,
} from '../../../shared/constants/auth.js';

const phoneNumber = z
  .string({ required_error: 'Phone number is required' })
  .trim()
  .regex(VN_PHONE_REGEX, VN_PHONE_MESSAGE);

const guestSchema = z.object({
  name: z
    .string({ required_error: 'Guest name is required' })
    .trim()
    .min(1, 'Guest name is required')
    .max(80, 'Guest name must be at most 80 characters'),
  skill: z
    .string({ required_error: 'Guest skill is required' })
    .trim()
    .min(1, 'Guest skill is required'),
  gender: z.enum(FEE_GENDERS, {
    errorMap: () => ({
      message: `Guest gender must be one of: ${FEE_GENDERS.join(', ')}`,
    }),
  }),
  phoneNumber,
});

export const joinMatchSchema = z.object({
  message: z
    .string()
    .trim()
    .max(500, 'message must be at most 500 characters')
    .nullish(),
  phoneNumber: phoneNumber.optional(),
  guests: z.array(guestSchema).max(10, 'At most 10 guests').optional().default([]),
});

export function parseJoinMatchDto(body, { sport } = {}) {
  const parsed = joinMatchSchema.parse(body ?? {});
  if (!sport) {
    return parsed;
  }

  const issues = [];
  parsed.guests.forEach((guest, index) => {
    if (!isSkillForSport(sport, guest.skill)) {
      issues.push({
        code: z.ZodIssueCode.custom,
        path: ['guests', index, 'skill'],
        message: `Guest skill is not valid for ${sport}`,
      });
    }
  });
  if (issues.length) {
    throw new ZodError(issues);
  }
  return parsed;
}
