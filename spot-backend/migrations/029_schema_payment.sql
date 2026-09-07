-- 029 — Payment transactions, invoices, booking payment fields.
-- Depends: 004, 026.

CREATE SCHEMA IF NOT EXISTS schema_payment;

CREATE TABLE IF NOT EXISTS schema_payment.transactions (
  transaction_id SERIAL PRIMARY KEY,
  booking_id INT NOT NULL REFERENCES schema_booking.bookings(booking_id) ON DELETE RESTRICT,
  player_id INT NOT NULL REFERENCES schema_auth.users(user_id) ON DELETE RESTRICT,
  provider VARCHAR(20) NOT NULL
    CHECK (provider IN ('VNPAY', 'MOMO')),
  amount_vnd INT NOT NULL CHECK (amount_vnd > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED')),
  provider_ref VARCHAR(64) NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  payment_url TEXT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ NULL,
  failure_reason TEXT NULL,
  raw_callback JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (provider, provider_ref)
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_booking_status
  ON schema_payment.transactions (booking_id, status);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_player_created
  ON schema_payment.transactions (player_id, created_at DESC);

CREATE TABLE IF NOT EXISTS schema_payment.invoices (
  invoice_id SERIAL PRIMARY KEY,
  transaction_id INT NOT NULL UNIQUE
    REFERENCES schema_payment.transactions(transaction_id) ON DELETE RESTRICT,
  booking_id INT NOT NULL REFERENCES schema_booking.bookings(booking_id) ON DELETE RESTRICT,
  invoice_number VARCHAR(32) NOT NULL UNIQUE,
  pdf_path VARCHAR(512) NOT NULL,
  amount_vnd INT NOT NULL CHECK (amount_vnd > 0),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_invoices_booking
  ON schema_payment.invoices (booking_id);

ALTER TABLE schema_booking.bookings
  ADD COLUMN IF NOT EXISTS booking_code VARCHAR(20) UNIQUE NULL,
  ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_payment_expires
  ON schema_booking.bookings (payment_expires_at)
  WHERE status = 'PENDING_PAYMENT' AND payment_expires_at IS NOT NULL;

-- Add BOOKING_PAYMENT_SUCCESS notification type.
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
    'BOOKING_PAYMENT_SUCCESS',
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
    'OWNER_NEW_BOOKING',
    'OWNER_NEW_REVIEW'
  ));
