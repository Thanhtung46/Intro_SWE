-- 011 — allow group inbox types on notifications.type
-- Depends: 010_schema_groups.sql

ALTER TABLE schema_notification.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

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
    'SYSTEM'
  ));
