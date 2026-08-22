-- 008 — Admin console: verification requests, audit log, system settings.
-- Depends: 001.

CREATE TABLE IF NOT EXISTS schema_auth.verification_requests (
  verification_req_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES schema_auth.users(user_id) ON DELETE CASCADE,
  request_type VARCHAR(30) NOT NULL
    CHECK (request_type IN ('OWNER_LICENSE', 'REFEREE_CREDENTIAL')),
  document_url VARCHAR(2048) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  admin_notes TEXT NULL,
  reviewed_by INT NULL REFERENCES schema_auth.users(user_id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_verification_requests_status_created
  ON schema_auth.verification_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_verification_requests_user_status
  ON schema_auth.verification_requests (user_id, status);

CREATE TABLE IF NOT EXISTS schema_auth.admin_audit_log (
  audit_id BIGSERIAL PRIMARY KEY,
  admin_user_id INT NOT NULL REFERENCES schema_auth.users(user_id) ON DELETE RESTRICT,
  action VARCHAR(50) NOT NULL,
  target_type VARCHAR(30) NOT NULL,
  target_id VARCHAR(64) NOT NULL,
  payload JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_admin_created
  ON schema_auth.admin_audit_log (admin_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_target
  ON schema_auth.admin_audit_log (target_type, target_id);

CREATE TABLE IF NOT EXISTS schema_auth.system_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value JSONB NOT NULL,
  updated_by INT NULL REFERENCES schema_auth.users(user_id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_auth.system_settings (setting_key, setting_value)
VALUES
  ('commissionRatePercent', '10'::jsonb),
  ('paymentGateways', '{"momo": {"enabled": false}, "vnpay": {"enabled": false}}'::jsonb),
  ('otpExpirySeconds', '300'::jsonb),
  ('defaultCancellationWindowHours', '24'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;
