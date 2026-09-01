import { z } from 'zod';

const monthRegex = /^\d{4}-\d{2}$/;

export const ownerDashboardQuerySchema = z.object({
  month: z.string().regex(monthRegex).optional(),
  venueId: z.coerce.number().int().positive().optional(),
  trendsWeeks: z.coerce.number().int().min(1).max(12).optional().default(4),
  recentLimit: z.coerce.number().int().min(1).max(20).optional().default(10),
});

export function parseOwnerDashboardQueryDto(query) {
  return ownerDashboardQuerySchema.parse(query ?? {});
}
