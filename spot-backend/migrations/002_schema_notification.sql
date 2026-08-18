-- Notification inbox + reminder jobs (squashed; timestamptz from the start).

CREATE SCHEMA IF NOT EXISTS schema_notification;

CREATE TABLE IF NOT EXISTS schema_notification.notifications (
  notification_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES schema_auth.users(user_id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL
    CHECK (type IN ('BOOKING_CREATED', 'BOOKING_REMINDER', 'SYSTEM')),
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  channel VARCHAR(20) NOT NULL DEFAULT 'IN_APP',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON schema_notification.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON schema_notification.notifications (user_id, is_read)
  WHERE is_read = FALSE;

CREATE TABLE IF NOT EXISTS schema_notification.reminder_jobs (
  reminder_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES schema_auth.users(user_id) ON DELETE CASCADE,
  booking_id INT NULL,
  offset_hours INT NOT NULL
    CHECK (offset_hours IN (24, 2)),
  fire_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'SENT', 'CANCELLED', 'FAILED')),
  notification_id INT NULL
    REFERENCES schema_notification.notifications(notification_id)
    ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reminder_jobs_pending_unique
  ON schema_notification.reminder_jobs (booking_id, user_id, offset_hours)
  WHERE booking_id IS NOT NULL AND status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_reminder_jobs_status_fire
  ON schema_notification.reminder_jobs (status, fire_at);
