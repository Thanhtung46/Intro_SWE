import { z } from 'zod';
import {
  REVIEW_RATING_MIN,
  REVIEW_RATING_MAX,
  REVIEW_TEXT_MAX_LENGTH,
  REVIEW_REPLY_MAX_LENGTH,
} from '../../../shared/constants/review.js';

function sanitizeText(value) {
  if (value === undefined || value === null) return value;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

/** Reject comment that is mostly the same character / tiny spam. */
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

export const createReviewSchema = z
  .object({
    bookingId: z.coerce.number().int().positive(),
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

export function parseCreateReviewDto(body) {
  return createReviewSchema.parse(body ?? {});
}

export const replyReviewSchema = z
  .object({
    replyText: z
      .string()
      .min(1)
      .max(REVIEW_REPLY_MAX_LENGTH)
      .transform((v) => v.trim()),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (!val.replyText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Reply text is required',
        path: ['replyText'],
      });
    }
    if (looksLikeSpam(val.replyText)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Reply text looks like spam',
        path: ['replyText'],
      });
    }
  });

export function parseReplyReviewDto(body) {
  return replyReviewSchema.parse(body ?? {});
}

export const reviewIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export function parseReviewIdParam(params) {
  return reviewIdParamSchema.parse(params);
}
