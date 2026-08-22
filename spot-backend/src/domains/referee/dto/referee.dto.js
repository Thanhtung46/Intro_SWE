import { z } from 'zod';
import { normalizeSportType } from '../../../shared/constants/venue.js';
import {
  REFEREE_INVITATION_TABS,
  REFEREE_COMPLETED_FILTERS,
} from '../../../shared/constants/referee.js';

const sportQuerySchema = z
  .string()
  .trim()
  .min(1)
  .transform((v) => normalizeSportType(v))
  .refine((v) => v != null, 'Unsupported sport');

export const boardQuerySchema = z.object({
  sport: sportQuerySchema,
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(100).optional().default(20),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export function parseBoardQueryDto(query) {
  const parsed = boardQuerySchema.parse(query ?? {});
  if ((parsed.lat != null) !== (parsed.lng != null)) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        message: 'lat and lng must be provided together',
        path: ['lat'],
      },
    ]);
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
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export function parseEarningsHistoryQueryDto(query) {
  return earningsHistoryQuerySchema.parse(query ?? {});
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
