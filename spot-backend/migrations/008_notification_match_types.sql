-- 008 — allow matchmaking inbox types on notifications.type
-- Depends: 003_schema_notification.sql

ALTER TABLE schema_notification.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE schema_notification.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'BOOKING_CREATED',
    'BOOKING_REMINDER',
    'MATCH_CANCELLED',
    'MATCH_EXPIRED_UNDERFILLED',
    'SYSTEM'
  ));
