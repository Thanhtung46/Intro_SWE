import { z } from 'zod';
import { normalizeSportType } from '../../../shared/constants/venue.js';
import {
  REFEREE_INVITATION_TABS,
  REFEREE_COMPLETED_FILTERS,
} from '../../../shared/constants/referee.js';
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

const sportQuerySchema = z
  .string()
  .trim()
  .min(1)
  .transform((v) => normalizeSportType(v))
  .refine((v) => v != null, 'Unsupported sport');

export const boardQuerySchema = z
  .object({
    sport: sportQuerySchema,
    lat: z.preprocess(
      blankToUndefined,
      z.coerce.number().min(-90).max(90).optional(),
    ),
    lng: z.preprocess(
      blankToUndefined,
      z.coerce.number().min(-180).max(180).optional(),
    ),
    latitude: z.preprocess(
      blankToUndefined,
      z.coerce.number().min(-90).max(90).optional(),
    ),
    longitude: z.preprocess(
      blankToUndefined,
      z.coerce.number().min(-180).max(180).optional(),
    ),
    radiusKm: z.preprocess(
      blankToUndefined,
      z.coerce.number().min(1).max(20).optional(),
    ),
    province: z.preprocess(
      blankToUndefined,
      z.string().trim().min(1).max(5).optional(),
    ),
    city: z.preprocess(
      blankToUndefined,
      z.string().trim().min(1).max(5).optional(),
    ),
    q: z.preprocess(
      blankToUndefined,
      z.string().trim().min(1).max(255).optional(),
    ),
    favorited: z.preprocess(optionalBoolean, z.boolean().optional()),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  })
  .transform((data) => ({
    ...data,
    lat: data.lat ?? data.latitude,
    lng: data.lng ?? data.longitude,
  }))
  .superRefine((data, ctx) => {
    const hasLat = data.lat != null;
    const hasLng = data.lng != null;
    const hasProvince = data.province != null;
    const hasCity = data.city != null;

    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: hasLat ? ['lng'] : ['lat'],
        message: 'lat and lng must be provided together',
      });
    }

    if ((hasProvince || hasCity) && (hasLat || hasLng)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['province'],
        message:
          'Use province/city or distance (lat, lng, radiusKm), not both',
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

export function parseBoardQueryDto(query) {
  const parsed = boardQuerySchema.parse(query ?? {});
  if (parsed.lat != null && parsed.lng != null && parsed.radiusKm == null) {
    parsed.radiusKm = 20;
  }
  return parsed;
}

export const registerVenueSchema = z.object({
  sportType: sportQuerySchema,
});

export function parseRegisterVenueDto(body) {
  return registerVenueSchema.parse(body ?? {});
}

export const cancelVenueRegistrationSchema = z.object({
  sportType: sportQuerySchema,
});

export function parseCancelVenueRegistrationDto(body) {
  return cancelVenueRegistrationSchema.parse(body ?? {});
}

export const invitationsQuerySchema = z.object({
  tab: z
    .enum([
      REFEREE_INVITATION_TABS.PENDING,
      REFEREE_INVITATION_TABS.CONFIRMED,
      REFEREE_INVITATION_TABS.COMPLETED,
    ])
    .optional()
    .default(REFEREE_INVITATION_TABS.PENDING),
  since: z.string().regex(/^\d+d$/).optional().default('30d'),
  filter: z
    .enum([
      REFEREE_COMPLETED_FILTERS.ALL,
      REFEREE_COMPLETED_FILTERS.COMPLETED,
      REFEREE_COMPLETED_FILTERS.DECLINED,
    ])
    .optional()
    .default(REFEREE_COMPLETED_FILTERS.ALL),
});

export function parseInvitationsQueryDto(query) {
  return invitationsQuerySchema.parse(query ?? {});
}

export const assignmentIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export function parseAssignmentIdParam(params) {
  return assignmentIdParamSchema.parse(params);
}

export const declineAssignmentSchema = z.object({
  reason: z.string().trim().min(1).max(500).optional(),
});

export function parseDeclineAssignmentDto(body) {
  return declineAssignmentSchema.parse(body ?? {});
}

export const scheduleQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM').optional(),
});

export function parseScheduleQueryDto(query) {
  return scheduleQuerySchema.parse(query ?? {});
}

export const earningsQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM').optional(),
});

export function parseEarningsQueryDto(query) {
  return earningsQuerySchema.parse(query ?? {});
}

export const earningsHistoryQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM').optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export function parseEarningsHistoryQueryDto(query) {
  return earningsHistoryQuerySchema.parse(query ?? {});
}

export const earningsMonthlyQuerySchema = z.object({
  anchor: z.string().regex(/^\d{4}-\d{2}$/, 'anchor must be YYYY-MM').optional(),
  months: z.coerce.number().int().min(2).max(12).optional().default(6),
});

export function parseEarningsMonthlyQueryDto(query) {
  return earningsMonthlyQuerySchema.parse(query ?? {});
}

export const venueIdParamSchema = z.object({
  venueId: z.coerce.number().int().positive(),
});

export function parseVenueIdParam(params) {
  return venueIdParamSchema.parse(params);
}

export function normalizeCertifiedSportTypes(types) {
  const normalized = [];
  for (const t of types) {
    const sport = normalizeSportType(t);
    if (sport && !normalized.includes(sport)) {
      normalized.push(sport);
    }
  }
  return normalized;
}
