import { z } from 'zod';
import { isSkillForSport, rankForSkill, SPORT_CODES } from '../../../shared/constants/sports.js';
import {
  GROUP_SCHEDULE,
  JOIN_MODE_CODES,
  normalizeCourtName,
  parseLocalTimeMinutes,
  slotsOverlap,
} from '../../../shared/constants/groups.js';
import { optionalHttpUrl } from '../../../shared/validation/httpUrl.js';
import { isVnCityInProvince, isVnProvince } from '../../../shared/constants/vn-admin.js';

const courtSchema = z.object({
  name: z
    .string({ required_error: 'Court name is required' })
    .trim()
    .min(1, 'Court name is required')
    .max(80, 'Court name must be at most 80 characters'),
});

const recurringSlotSchema = z.object({
  dayOfWeek: z
    .number({ required_error: 'dayOfWeek is required' })
    .int('dayOfWeek must be an integer')
    .min(GROUP_SCHEDULE.DAY_OF_WEEK_MIN, 'dayOfWeek must be 1 (Mon) to 7 (Sun)')
    .max(GROUP_SCHEDULE.DAY_OF_WEEK_MAX, 'dayOfWeek must be 1 (Mon) to 7 (Sun)'),
  startsAt: z
    .string({ required_error: 'startsAt is required' })
    .regex(
      /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/,
      'startsAt must be HH:mm on a 30-minute boundary',
    )
    .transform((value) => (value.length === 5 ? `${value}:00` : value)),
  durationMinutes: z
    .number({ required_error: 'durationMinutes is required' })
    .int('durationMinutes must be an integer')
    .min(
      GROUP_SCHEDULE.MIN_DURATION_MINUTES,
      `durationMinutes must be at least ${GROUP_SCHEDULE.MIN_DURATION_MINUTES}`,
    )
    .max(24 * 60, 'durationMinutes must be at most 1440'),
  courtName: z
    .string({ required_error: 'courtName is required' })
    .trim()
    .min(1, 'courtName is required')
    .max(80, 'courtName must be at most 80 characters'),
});

function validateCourtsAndSlots(data, ctx, sport) {
  if (data.courts) {
    const courtNames = data.courts.map((court) => court.name.trim().toLowerCase());
    if (new Set(courtNames).size !== courtNames.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['courts'],
        message: 'Court names must be unique within the group',
      });
    }
  }

  if (!data.recurringSlots?.length) {
    return;
  }

  const courtNameSet = new Set(
    (data.courts || []).map((court) => normalizeCourtName(court.name)),
  );
  if (!data.courts?.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['recurringSlots'],
      message: 'courts is required when updating recurringSlots',
    });
    return;
  }

  const slotKeys = [];
  data.recurringSlots.forEach((slot, index) => {
    const courtKey = normalizeCourtName(slot.courtName);
    if (!courtNameSet.has(courtKey)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recurringSlots', index, 'courtName'],
        message: 'courtName must match a court in courts[]',
      });
    }

    const startMinutes = parseLocalTimeMinutes(slot.startsAt);
    if (startMinutes == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recurringSlots', index, 'startsAt'],
        message: 'startsAt must be a valid time',
      });
      return;
    }
    if (startMinutes % GROUP_SCHEDULE.SLOT_STEP_MINUTES !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recurringSlots', index, 'startsAt'],
        message: 'startsAt must align to 30-minute boundaries',
      });
    }
    if (slot.durationMinutes % GROUP_SCHEDULE.SLOT_STEP_MINUTES !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recurringSlots', index, 'durationMinutes'],
        message: 'durationMinutes must be a multiple of 30',
      });
    }
    if (startMinutes + slot.durationMinutes > 24 * 60) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recurringSlots', index, 'durationMinutes'],
        message: 'Slot must end before midnight',
      });
    }

    const key = `${slot.dayOfWeek}:${courtKey}`;
    for (const existing of slotKeys) {
      if (
        existing.key === key &&
        slotsOverlap(
          existing.startMinutes,
          existing.durationMinutes,
          startMinutes,
          slot.durationMinutes,
        )
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recurringSlots', index],
          message: 'Recurring slots overlap on the same court and day',
        });
        break;
      }
    }
    slotKeys.push({
      key,
      startMinutes,
      durationMinutes: slot.durationMinutes,
    });
  });
}

export const updateGroupSchema = z
  .object({
    sport: z.enum(SPORT_CODES).optional(),
    name: z.string().trim().min(1).max(150).optional(),
    title: z.string().trim().min(1).max(150).optional(),
    description: z.string().trim().max(5000).nullish(),
    joinMode: z.enum(JOIN_MODE_CODES).optional(),
    allLevels: z.boolean().optional(),
    skillMin: z.string().optional(),
    skillMax: z.string().optional(),
    logoUrl: optionalHttpUrl('logoUrl'),
    coverUrl: optionalHttpUrl('coverUrl'),
    venueName: z.string().trim().min(1).max(255).optional(),
    venueAddress: z.string().trim().min(1).max(500).optional(),
    province: z.string().trim().min(1).max(5).optional(),
    city: z.string().trim().min(1).max(5).optional(),
    latitude: z.number().gte(-90).lte(90).nullish(),
    longitude: z.number().gte(-180).lte(180).nullish(),
    zaloUrl: optionalHttpUrl('zaloUrl'),
    courts: z.array(courtSchema).min(1).max(GROUP_SCHEDULE.MAX_COURTS).optional(),
    recurringSlots: z
      .array(recurringSlotSchema)
      .min(1)
      .max(GROUP_SCHEDULE.MAX_SLOTS)
      .optional(),
  })
  .superRefine((data, ctx) => {
    const keys = Object.keys(data).filter((key) => data[key] !== undefined);
    if (!keys.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one field is required',
      });
    }

    const hasLat = data.latitude != null;
    const hasLng = data.longitude != null;
    if (
      data.latitude !== undefined &&
      data.longitude !== undefined &&
      hasLat !== hasLng
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: hasLat ? ['longitude'] : ['latitude'],
        message: 'latitude and longitude must be sent together',
      });
    }

    if (data.province && !isVnProvince(data.province)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['province'],
        message: 'province is not a valid pre-2025 tỉnh/thành phố code',
      });
    }
    if (data.city && data.province && !isVnCityInProvince(data.province, data.city)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['city'],
        message: 'city must belong to province (pre-2025 quận/huyện codes)',
      });
    }
    if (data.city && !data.province) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['province'],
        message: 'province is required when updating city',
      });
    }

    const sport = data.sport;
    if (sport && data.skillMin && !isSkillForSport(sport, data.skillMin)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['skillMin'],
        message: `skillMin is not valid for ${sport}`,
      });
    }
    if (sport && data.skillMax && !isSkillForSport(sport, data.skillMax)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['skillMax'],
        message: `skillMax is not valid for ${sport}`,
      });
    }
    if (sport && data.skillMin && data.skillMax) {
      const minRank = rankForSkill(sport, data.skillMin);
      const maxRank = rankForSkill(sport, data.skillMax);
      if (minRank != null && maxRank != null && minRank > maxRank) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['skillMax'],
          message: 'skillMax must be greater than or equal to skillMin',
        });
      }
    }

    if (data.recurringSlots && !data.courts) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['courts'],
        message: 'courts is required when updating recurringSlots',
      });
    }

    validateCourtsAndSlots(data, ctx, sport);
  });

export function parseUpdateGroupDto(body) {
  return updateGroupSchema.parse(body ?? {});
}
