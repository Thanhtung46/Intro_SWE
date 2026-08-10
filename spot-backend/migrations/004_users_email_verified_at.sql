-- Persist email verification timestamp after successful OTP verify.

ALTER TABLE schema_auth.users
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP NULL;
