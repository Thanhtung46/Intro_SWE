import { z } from 'zod';

export const dashboardQuerySchema = z.object({
  registrationDays: z.coerce.number().int().min(7).max(90).optional().default(30),
  role: z
    .enum(['PLAYER', 'OWNER', 'REFEREE', 'ADMIN'])
    .optional(),
});

export function parseDashboardQueryDto(query) {
  return dashboardQuerySchema.parse(query);
}

export const listAuditLogSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export function parseListAuditLogDto(query) {
  return listAuditLogSchema.parse(query);
}
