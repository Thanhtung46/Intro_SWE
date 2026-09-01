import { z } from 'zod';
import {
  REVIEW_RATING_MIN,
  REVIEW_RATING_MAX,
  REVIEW_TEXT_MAX_LENGTH,
} from '../../../shared/constants/review.js';

function sanitizeText(value) {
  if (value === undefined || value === null) return value;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function looksLikeSpam(text) {
  if (!text) return false;
  if (/(https?:\/\/|www\.)/i.test(text) && text.length < 40) return true;
  const compact = text.replace(/\s+/g, '');
  if (compact.length >= 8) {
    const unique = new Set(compact.toLowerCase()).size;
    if (unique <= 2) return true;
  }
  return false;
}

export const createMatchHostReviewSchema = z
  .object({
    rating: z.coerce
      .number()
      .int()
      .min(REVIEW_RATING_MIN)
      .max(REVIEW_RATING_MAX),
    reviewText: z
      .string()
      .max(REVIEW_TEXT_MAX_LENGTH)
      .optional()
      .nullable()
      .transform(sanitizeText),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.reviewText && looksLikeSpam(val.reviewText)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Review text looks like spam',
        path: ['reviewText'],
      });
    }
  });

export function parseCreateMatchHostReviewDto(body) {
  return createMatchHostReviewSchema.parse(body ?? {});
}

export const listHostReviewsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export function parseListHostReviewsQuery(query) {
  return listHostReviewsQuerySchema.parse(query ?? {});
}
