-- 009 — owner console ops: peak/off-peak pricing, maintenance notes, revenue indexes.
-- Depends: 004, 005, 007.

ALTER TABLE schema_venue.fields
  ADD COLUMN IF NOT EXISTS peak_price_per_hour DECIMAL(10, 2) NULL,
  ADD COLUMN IF NOT EXISTS off_peak_price_per_hour DECIMAL(10, 2) NULL,
  ADD COLUMN IF NOT EXISTS maintenance_note TEXT NULL;

UPDATE schema_venue.fields
SET
  peak_price_per_hour = COALESCE(peak_price_per_hour, price_per_hour),
  off_peak_price_per_hour = COALESCE(off_peak_price_per_hour, price_per_hour)
WHERE peak_price_per_hour IS NULL OR off_peak_price_per_hour IS NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_revenue_owner
  ON schema_booking.bookings (field_id, status, booking_date);

CREATE INDEX IF NOT EXISTS idx_reviews_venue_rating
  ON schema_review.reviews (venue_id, rating, created_at DESC);
