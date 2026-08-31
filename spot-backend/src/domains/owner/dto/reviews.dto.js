import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const listOwnerReviewsSchema = z.object({
  venueId: z.coerce.number().int().positive().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  hasReply: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  from: z.string().regex(dateRegex).optional(),
  to: z.string().regex(dateRegex).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export function parseListOwnerReviewsDto(query) {
  return listOwnerReviewsSchema.parse(query ?? {});
}

export const ownerReviewIdParamSchema = z.object({
  reviewId: z.coerce.number().int().positive(),
});

export function parseOwnerReviewIdParam(params) {
  return ownerReviewIdParamSchema.parse(params);
}
