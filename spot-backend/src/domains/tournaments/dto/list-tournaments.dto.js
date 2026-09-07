import { z } from 'zod';
import { SPORT_CODES } from '../../../shared/constants/sports.js';
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

export const listTournamentsQuerySchema = z
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
        .min(0, 'radiusKm must be at least 0')
        .max(50, 'radiusKm must be at most 50')
        .optional(),
    ),
    favorited: z.preprocess(optionalBoolean, z.boolean().optional()),
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
    const hasLat = data.latitude != null;
    const hasLng = data.longitude != null;
    const hasRadius = data.radiusKm != null;
    if (hasLat || hasLng || hasRadius) {
      if (!hasLat || !hasLng || !hasRadius) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: !hasRadius ? ['radiusKm'] : !hasLat ? ['latitude'] : ['longitude'],
          message:
            'latitude, longitude, and radiusKm must be sent together (distance 0–50 km)',
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

export function parseListTournamentsQuery(query) {
  return listTournamentsQuerySchema.parse(query);
}
