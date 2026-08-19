import { z } from 'zod';
import { SPORT_CODES, isSkillForSport, rankForSkill } from '../../../shared/constants/sports.js';
import {
  GROUP_SCHEDULE,
  JOIN_MODE_CODES,
  normalizeCourtName,
  parseLocalTimeMinutes,
  slotsOverlap,
} from '../../../shared/constants/groups.js';
import { optionalHttpUrl } from '../../../shared/validation/httpUrl.js';
import { isVnCityInProvince } from '../../../shared/constants/vn-admin.js';

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

export const createGroupSchema = z
  .object({
    sport: z.enum(SPORT_CODES, {
      errorMap: () => ({
        message: `Sport must be one of: ${SPORT_CODES.join(', ')}`,
      }),
    }),
    name: z
      .string({ required_error: 'name is required' })
      .trim()
      .min(1, 'name is required')
      .max(150, 'name must be at most 150 characters'),
    title: z
      .string({ required_error: 'title is required' })
      .trim()
      .min(1, 'title is required')
      .max(150, 'title must be at most 150 characters'),
    description: z
      .string()
      .trim()
      .max(5000, 'description must be at most 5000 characters')
      .nullish(),
    joinMode: z.enum(JOIN_MODE_CODES, {
      errorMap: () => ({
        message: `joinMode must be one of: ${JOIN_MODE_CODES.join(', ')}`,
      }),
    }),
    allLevels: z.boolean().optional().default(false),
    skillMin: z.string().optional(),
    skillMax: z.string().optional(),
    logoUrl: optionalHttpUrl('logoUrl'),
    coverUrl: optionalHttpUrl('coverUrl'),
    venueName: z
      .string({ required_error: 'venueName is required' })
      .trim()
      .min(1, 'venueName is required')
      .max(255, 'venueName must be at most 255 characters'),
    venueAddress: z
      .string({ required_error: 'venueAddress is required' })
      .trim()
      .min(1, 'venueAddress is required')
      .max(500, 'venueAddress must be at most 500 characters'),
    province: z
      .string({ required_error: 'province is required' })
      .trim()
      .min(1, 'province is required')
      .max(5, 'province must be at most 5 characters'),
    city: z
      .string({ required_error: 'city is required' })
      .trim()
      .min(1, 'city is required')
      .max(5, 'city must be at most 5 characters'),
    latitude: z
      .number({ invalid_type_error: 'latitude must be a number' })
      .gte(-90, 'latitude must be >= -90')
      .lte(90, 'latitude must be <= 90')
      .nullish(),
    longitude: z
      .number({ invalid_type_error: 'longitude must be a number' })
      .gte(-180, 'longitude must be >= -180')
      .lte(180, 'longitude must be <= 180')
      .nullish(),
    zaloUrl: optionalHttpUrl('zaloUrl'),
    courts: z
      .array(courtSchema, { required_error: 'courts is required' })
      .min(1, 'At least one court is required')
      .max(GROUP_SCHEDULE.MAX_COURTS, `courts must have at most ${GROUP_SCHEDULE.MAX_COURTS} items`),
    recurringSlots: z
      .array(recurringSlotSchema, { required_error: 'recurringSlots is required' })
      .min(1, 'At least one recurring slot is required')
      .max(GROUP_SCHEDULE.MAX_SLOTS, `recurringSlots must have at most ${GROUP_SCHEDULE.MAX_SLOTS} items`),
  })
  .superRefine((data, ctx) => {
    const hasLat = data.latitude != null;
    const hasLng = data.longitude != null;
    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: hasLat ? ['longitude'] : ['latitude'],
        message: 'latitude and longitude must be sent together',
      });
    }

    if (!isVnCityInProvince(data.province, data.city)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['city'],
        message: 'city must belong to province (pre-2025 tỉnh / quận-huyện codes)',
      });
    }

    if (!data.allLevels) {
      if (!data.skillMin) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['skillMin'],
          message: 'skillMin is required unless allLevels is true',
        });
      } else if (!isSkillForSport(data.sport, data.skillMin)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['skillMin'],
          message: `skillMin is not valid for ${data.sport}`,
        });
      }
      if (!data.skillMax) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['skillMax'],
          message: 'skillMax is required unless allLevels is true',
        });
      } else if (!isSkillForSport(data.sport, data.skillMax)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['skillMax'],
          message: `skillMax is not valid for ${data.sport}`,
        });
      }
      const minRank = rankForSkill(data.sport, data.skillMin);
      const maxRank = rankForSkill(data.sport, data.skillMax);
      if (minRank != null && maxRank != null && minRank > maxRank) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['skillMax'],
          message: 'skillMax must be greater than or equal to skillMin',
        });
      }
    }

    const courtNames = data.courts.map((court) => court.name.trim().toLowerCase());
    if (new Set(courtNames).size !== courtNames.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['courts'],
        message: 'Court names must be unique within the group',
      });
    }

    const courtNameSet = new Set(
      data.courts.map((court) => normalizeCourtName(court.name)),
    );

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
  });

export function parseCreateGroupDto(body) {
  return createGroupSchema.parse(body);
}
