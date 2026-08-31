-- 010 — allow owner-facing notification types (OWNER_NEW_BOOKING, OWNER_NEW_REVIEW).
-- Depends: 003.
--
-- IMPORTANT: the live `notifications_type_check` constraint on the shared
-- Supabase DB already allows more values than this branch's local migration
-- history shows (matchmaking/groups/tournaments/referee features built on
-- other branches — e.g. `011_notification_group_types.sql`,
-- `013_notification_tournament_types.sql`, `018_referee_reviews_notification.sql`
-- — apply their own migrations against the same shared DB; those files don't
-- exist in this branch's `migrations/` folder). This migration is written as
-- a SUPERSET of the actual live constraint (confirmed via
-- `pg_get_constraintdef` before writing this file, not guessed from
-- `003_schema_notification.sql` alone) so it does not silently drop those
-- other teams' in-use types.

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
    'TOURNAMENT_JOIN_REQUEST',
    'TOURNAMENT_JOIN_APPROVED',
    'TOURNAMENT_JOIN_REJECTED',
    'TOURNAMENT_CANCELLED',
    'TOURNAMENT_KICKED',
    'TOURNAMENT_UPDATED',
    'SYSTEM',
    'REFEREE_INVITATION',
    'REFEREE_RATING_REQUEST',
    'OWNER_NEW_BOOKING',
    'OWNER_NEW_REVIEW'
  ));
