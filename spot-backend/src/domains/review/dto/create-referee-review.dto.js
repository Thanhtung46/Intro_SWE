import { z } from 'zod';
import {
  REFEREE_REVIEW_RATING_MIN,
  REFEREE_REVIEW_RATING_MAX,
  REFEREE_REVIEW_RATING_STEP,
} from '../../../shared/constants/review.js';

function isHalfStepRating(value) {
  const steps = Math.round(value / REFEREE_REVIEW_RATING_STEP);
  return Math.abs(value - steps * REFEREE_REVIEW_RATING_STEP) < 1e-9;
}

export const createRefereeReviewSchema = z
  .object({
    bookingId: z.coerce.number().int().positive(),
    rating: z.coerce
      .number()
      .min(REFEREE_REVIEW_RATING_MIN)
      .max(REFEREE_REVIEW_RATING_MAX)
      .refine(isHalfStepRating, {
        message: `rating must be between ${REFEREE_REVIEW_RATING_MIN} and ${REFEREE_REVIEW_RATING_MAX} in ${REFEREE_REVIEW_RATING_STEP} steps`,
      }),
  })
  .strict();

export function parseCreateRefereeReviewDto(body) {
  return createRefereeReviewSchema.parse(body ?? {});
}

export const refereeIdParamSchema = z.object({
  refereeId: z.coerce.number().int().positive(),
});

export function parseRefereeIdParam(params) {
  return refereeIdParamSchema.parse(params);
}
