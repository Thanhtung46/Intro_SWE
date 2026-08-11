-- Auth schema (canonical). Replaces former 001–005 chain for fresh installs.
-- Existing DBs that already applied 001–005: no-op (001 filename already recorded).

CREATE SCHEMA IF NOT EXISTS schema_auth;

CREATE TABLE IF NOT EXISTS schema_auth.users (
  user_id SERIAL PRIMARY KEY,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(15) NOT NULL UNIQUE,
  gender VARCHAR(30) NOT NULL
    CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  role VARCHAR(20) NOT NULL DEFAULT 'PLAYER'
    CHECK (role IN ('PLAYER', 'OWNER', 'REFEREE', 'ADMIN')),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'PENDING', 'LOCKED')),
  login_attempts INT NOT NULL DEFAULT 0,
  lockout_until TIMESTAMP NULL,
  email_verified_at TIMESTAMP NULL,
  role_selected_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schema_auth.otp_verifications (
  otp_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES schema_auth.users(user_id) ON DELETE CASCADE,
  otp_code VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  purpose VARCHAR(50) NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_verifications_user_purpose
  ON schema_auth.otp_verifications (user_id, purpose)
  WHERE is_used = FALSE;

-- Drop legacy table if present (from early scaffold).
DROP TABLE IF EXISTS schema_auth.user_profiles CASCADE;
DROP TABLE IF EXISTS schema_auth.otp_tokens CASCADE;
