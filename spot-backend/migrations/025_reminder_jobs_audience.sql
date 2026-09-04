-- 025 — owner booking notifications: who a reminder job is for.
-- Depends: 003 (schema_notification), 010 (schema_owner_schedule).

ALTER TABLE schema_notification.reminder_jobs
  ADD COLUMN IF NOT EXISTS audience VARCHAR(10) NOT NULL DEFAULT 'PLAYER'
    CHECK (audience IN ('PLAYER', 'OWNER'));
