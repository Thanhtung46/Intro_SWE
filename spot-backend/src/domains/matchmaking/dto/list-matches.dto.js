import { z } from 'zod';
import {
  SPORT_CODES,
  isSkillForSport,
} from '../../../shared/constants/sports.js';
import { PG_INT4_MAX } from '../../../shared/constants/auth.js';
import {
  isVnCityInProvince,
  isVnProvince,
} from '../../../shared/constants/vn-admin.js';

const blankToUndefined = (value) =>
  value === '' || value === undefined || value === null ? undefined : value;

function optionalBoolean(value) {
  const next = blankToUndefined(value);
  if (next === undefined) {
    return undefined;
  }
  if (next === true || next === 'true' || next === '1') {
    return true;
  }
  if (next === false || next === 'false' || next === '0') {
    return false;
  }
  return next;
}

function skillQueryToList(value) {
  const next = blankToUndefined(value);
  if (next === undefined) {
    return undefined;
  }
  const parts = (Array.isArray(next) ? next : [next]).flatMap((item) =>
    String(item)
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean),
  );
  if (!parts.length) {
    return undefined;
  }
  return [...new Set(parts)];
}

export const listMatchesQuerySchema = z
  .object({
    sport: z.preprocess(
      blankToUndefined,
      z
        .enum(SPORT_CODES, {
          errorMap: () => ({
            message: `Sport must be one of: ${SPORT_CODES.join(', ')}`,
          }),
        })
        .optional(),
    ),
    date: z.preprocess(
      blankToUndefined,
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
        .optional(),
    ),
    timeFrom: z.preprocess(
      blankToUndefined,
      z
        .string()
        .regex(
          /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/,
          'timeFrom must be HH:mm',
        )
        .transform((value) => (value.length === 5 ? `${value}:00` : value))
        .optional(),
    ),
    timeTo: z.preprocess(
      blankToUndefined,
      z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'timeTo must be HH:mm')
        .transform((value) => (value.length === 5 ? `${value}:00` : value))
        .optional(),
    ),
    skill: z.preprocess(
      skillQueryToList,
      z.array(z.string().min(1)).max(10, 'At most 10 skill filters').optional(),
    ),
    priceMin: z.preprocess(
      blankToUndefined,
      z.coerce
        .number()
        .int('priceMin must be an integer')
        .min(0, 'priceMin must be >= 0')
        .optional(),
    ),
    priceMax: z.preprocess(
      blankToUndefined,
      z.coerce
        .number()
        .int('priceMax must be an integer')
        .min(0, 'priceMax must be >= 0')
        .optional(),
    ),
    location: z.preprocess(
      blankToUndefined,
      z.string().trim().min(1).max(255).optional(),
    ),
    province: z.preprocess(
      blankToUndefined,
      z.string().trim().min(1).max(5).optional(),
    ),
    city: z.preprocess(
      blankToUndefined,
      z.string().trim().min(1).max(5).optional(),
    ),
    latitude: z.preprocess(
      blankToUndefined,
      z.coerce
        .number()
        .gte(-90, 'latitude must be >= -90')
        .lte(90, 'latitude must be <= 90')
        .optional(),
    ),
    longitude: z.preprocess(
      blankToUndefined,
      z.coerce
        .number()
        .gte(-180, 'longitude must be >= -180')
        .lte(180, 'longitude must be <= 180')
        .optional(),
    ),
    radiusKm: z.preprocess(
      blankToUndefined,
      z.coerce
        .number()
        .min(1, 'radiusKm must be at least 1')
        .max(20, 'radiusKm must be at most 20')
        .optional(),
    ),
    favorited: z.preprocess(optionalBoolean, z.boolean().optional()),
    hostUserId: z.preprocess(
      blankToUndefined,
      z.coerce
        .number()
        .int('hostUserId must be an integer')
        .min(1, 'hostUserId must be >= 1')
        .max(PG_INT4_MAX, 'hostUserId is out of range')
        .optional(),
    ),
    limit: z.preprocess(
      blankToUndefined,
      z.coerce.number().int().min(1).max(50).optional().default(20),
    ),
    offset: z.preprocess(
      blankToUndefined,
      z.coerce.number().int().min(0).optional().default(0),
    ),
  })
  .superRefine((data, ctx) => {
    const skills = data.skill || [];
    if (skills.length && !data.sport) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sport'],
        message: 'sport is required when filtering by skill',
      });
    }
    if (skills.length && data.sport) {
      skills.forEach((code, index) => {
        if (!isSkillForSport(data.sport, code)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['skill', index],
            message: `skill is not valid for ${data.sport}`,
          });
        }
      });
    }
    if (data.timeFrom && data.timeTo && data.timeFrom >= data.timeTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['timeTo'],
        message: 'timeTo must be after timeFrom',
      });
    }
    if (
      data.priceMin != null &&
      data.priceMax != null &&
      data.priceMin > data.priceMax
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['priceMax'],
        message: 'priceMax must be greater than or equal to priceMin',
      });
    }
    const hasLat = data.latitude != null;
    const hasLng = data.longitude != null;
    const hasRadius = data.radiusKm != null;
    if (hasLat || hasLng || hasRadius) {
      if (!hasLat || !hasLng || !hasRadius) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: !hasRadius ? ['radiusKm'] : !hasLat ? ['latitude'] : ['longitude'],
          message:
            'latitude, longitude, and radiusKm must be sent together (distance 1–20 km)',
        });
      }
    }
    if (data.location && (hasLat || hasLng || hasRadius)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['location'],
        message: 'Use location or distance (latitude, longitude, radiusKm), not both',
      });
    }
    if (data.city && !data.province) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['province'],
        message: 'province is required when filtering by city',
      });
    }
    if (data.province && !isVnProvince(data.province)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['province'],
        message: 'province is not a valid pre-2025 tỉnh/thành phố code',
      });
    }
    if (
      data.province &&
      data.city &&
      !isVnCityInProvince(data.province, data.city)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['city'],
        message: 'city must belong to province (pre-2025 quận/huyện codes)',
      });
    }
  });

export function parseListMatchesQuery(query) {
  return listMatchesQuerySchema.parse(query);
}
