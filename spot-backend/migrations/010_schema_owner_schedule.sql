-- 010 — owner console schedule: guest columns for owner-created walk-in bookings.
-- Depends: 004, 009.

ALTER TABLE schema_booking.bookings
  ADD COLUMN IF NOT EXISTS guest_name VARCHAR(150) NULL,
  ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(30) NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_field_date
  ON schema_booking.bookings (field_id, booking_date);
