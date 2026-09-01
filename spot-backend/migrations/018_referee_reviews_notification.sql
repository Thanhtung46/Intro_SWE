-- 011 — Player reviews for referees + REFEREE_INVITATION notification type.
-- Depends: 009, 005, 003.

CREATE TABLE IF NOT EXISTS schema_review.referee_reviews (
  review_id SERIAL PRIMARY KEY,
  assignment_id INT NOT NULL UNIQUE
    REFERENCES schema_referee.referee_assignments(assignment_id) ON DELETE CASCADE,
  booking_id INT NOT NULL
    REFERENCES schema_booking.bookings(booking_id) ON DELETE CASCADE,
  referee_id INT NOT NULL
    REFERENCES schema_auth.users(user_id) ON DELETE RESTRICT,
  player_id INT NOT NULL
    REFERENCES schema_auth.users(user_id) ON DELETE RESTRICT,
  rating INT NOT NULL
    CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_referee_reviews_referee_created
  ON schema_review.referee_reviews (referee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_referee_reviews_player
  ON schema_review.referee_reviews (player_id);

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'schema_notification'
      AND t.relname = 'notifications'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%type%'
  LOOP
    EXECUTE format(
      'ALTER TABLE schema_notification.notifications DROP CONSTRAINT IF EXISTS %I',
      r.conname
    );
  END LOOP;
END $$;

UPDATE schema_notification.notifications
SET type = 'SYSTEM'
WHERE type NOT IN (
  'BOOKING_CREATED',
  'BOOKING_REMINDER',
  'SYSTEM',
  'REFEREE_INVITATION'
);

ALTER TABLE schema_notification.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'BOOKING_CREATED',
    'BOOKING_REMINDER',
    'SYSTEM',
    'REFEREE_INVITATION'
  ));
