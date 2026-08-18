-- 001 — schema_auth. Depends: none.
-- users = identity; user_profiles = display + Settings prefs; user_prefs = view.

CREATE SCHEMA IF NOT EXISTS schema_auth;

CREATE TABLE IF NOT EXISTS schema_auth.users (
  user_id SERIAL PRIMARY KEY,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone_number VARCHAR(15) NOT NULL UNIQUE,
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

CREATE TABLE IF NOT EXISTS schema_auth.user_profiles (
  user_id INT PRIMARY KEY
    REFERENCES schema_auth.users(user_id) ON DELETE CASCADE,
  full_name VARCHAR(100) NOT NULL,
  gender VARCHAR(30) NOT NULL
    CHECK (gender IN ('male', 'female')),
  avatar_url VARCHAR(2048) NULL,
  language VARCHAR(10) NOT NULL DEFAULT 'en'
    CHECK (language IN ('en', 'vi')),
  appearance VARCHAR(20) NOT NULL DEFAULT 'light'
    CHECK (appearance IN ('light', 'dark', 'system')),
  push_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  location_services_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE VIEW schema_auth.user_prefs AS
SELECT
  user_id,
  language,
  appearance,
  push_notifications_enabled,
  location_services_enabled,
  updated_at
FROM schema_auth.user_profiles;

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

-- Legacy scaffold only. Do not drop user_profiles.
DROP TABLE IF EXISTS schema_auth.otp_tokens CASCADE;
