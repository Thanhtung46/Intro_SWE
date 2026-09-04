-- 029 — Referee: one-time "Account Activated" acknowledgement (server-side).
-- Replaces the device-local AsyncStorage flag so the celebration shows exactly
-- once per referee, across every device.
ALTER TABLE schema_referee.referee_profiles
  ADD COLUMN IF NOT EXISTS activation_ack_at TIMESTAMPTZ;
