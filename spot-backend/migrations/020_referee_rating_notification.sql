-- 013 — Player prompt to rate referee after match ends + scheduled jobs.
-- Depends: 011, 009, 003.

CREATE TABLE IF NOT EXISTS schema_notification.referee_rating_jobs (
  job_id SERIAL PRIMARY KEY,
  assignment_id INT NOT NULL UNIQUE
    REFERENCES schema_referee.referee_assignments(assignment_id) ON DELETE CASCADE,
  player_id INT NOT NULL
    REFERENCES schema_auth.users(user_id) ON DELETE CASCADE,
  referee_id INT NOT NULL
    REFERENCES schema_auth.users(user_id) ON DELETE CASCADE,
  booking_id INT NOT NULL
    REFERENCES schema_booking.bookings(booking_id) ON DELETE CASCADE,
  fire_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'SENT', 'CANCELLED', 'FAILED', 'SKIPPED')),
  notification_id INT NULL
    REFERENCES schema_notification.notifications(notification_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_referee_rating_jobs_due
  ON schema_notification.referee_rating_jobs (status, fire_at)
  WHERE status = 'PENDING';

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
  'REFEREE_INVITATION',
  'REFEREE_RATING_REQUEST'
);

ALTER TABLE schema_notification.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'BOOKING_CREATED',
    'BOOKING_REMINDER',
    'SYSTEM',
    'REFEREE_INVITATION',
    'REFEREE_RATING_REQUEST'
  ));
