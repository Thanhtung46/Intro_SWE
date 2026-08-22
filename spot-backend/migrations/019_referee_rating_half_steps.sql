-- 012 — Referee player rating: 0.5–5.0 in half-star steps (rating only, no text required).
-- Depends: 011.

ALTER TABLE schema_review.referee_reviews
  DROP CONSTRAINT IF EXISTS referee_reviews_rating_check;

ALTER TABLE schema_review.referee_reviews
  ALTER COLUMN rating TYPE NUMERIC(2, 1) USING rating::numeric(2, 1);

ALTER TABLE schema_review.referee_reviews
  ADD CONSTRAINT referee_reviews_rating_check
  CHECK (
    rating >= 0.5
    AND rating <= 5
    AND (rating * 2)::integer = (rating * 2)
  );

COMMENT ON COLUMN schema_review.referee_reviews.rating IS
  'Player star rating for referee: 0.5, 1.0, … 5.0';

COMMENT ON COLUMN schema_review.referee_reviews.review_text IS
  'Unused for referee ratings (rating-only product rule); kept for schema compat';
