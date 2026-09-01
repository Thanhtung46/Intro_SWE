-- 026 — add OWNER_BOOKING_CREATED / OWNER_BOOKING_CANCELLED /
-- OWNER_BOOKING_REMINDER to notifications.type enum (venue-owner booking
-- notifications — spec 006-owner-booking-web).
-- Depends: 024.

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

ALTER TABLE schema_notification.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'BOOKING_CREATED',
    'BOOKING_REMINDER',
    'MATCH_CANCELLED',
    'MATCH_EXPIRED_UNDERFILLED',
    'GROUP_JOIN_REQUEST',
    'GROUP_APPROVED',
    'GROUP_REJECTED',
    'GROUP_KICKED',
    'GROUP_ADMIN_TRANSFERRED',
    'TOURNAMENT_JOIN_REQUEST',
    'TOURNAMENT_JOIN_APPROVED',
    'TOURNAMENT_JOIN_REJECTED',
    'TOURNAMENT_CANCELLED',
    'TOURNAMENT_KICKED',
    'TOURNAMENT_UPDATED',
    'SYSTEM',
    'REFEREE_INVITATION',
    'REFEREE_RATING_REQUEST',
    'OWNER_BOOKING_CREATED',
    'OWNER_BOOKING_CANCELLED',
    'OWNER_BOOKING_REMINDER',
    -- Pre-existing rows from an earlier iteration with no current code
    -- path creating them; kept in the enum so this migration doesn't
    -- fail on data it doesn't own the context to delete.
    'OWNER_NEW_BOOKING',
    'OWNER_NEW_REVIEW'
  ));
