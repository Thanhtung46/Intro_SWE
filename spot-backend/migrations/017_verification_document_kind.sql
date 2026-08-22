-- 010 — Verification document kinds for referee batch submit + cert updates.

ALTER TABLE schema_auth.verification_requests
  ADD COLUMN IF NOT EXISTS document_kind VARCHAR(30) NULL;

ALTER TABLE schema_auth.verification_requests
  DROP CONSTRAINT IF EXISTS verification_requests_document_kind_check;

ALTER TABLE schema_auth.verification_requests
  ADD CONSTRAINT verification_requests_document_kind_check
  CHECK (
    document_kind IS NULL
    OR document_kind IN ('ID_FRONT', 'ID_BACK', 'VFF_LICENSE', 'CERT_UPDATE')
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_pending_kind
  ON schema_auth.verification_requests (user_id, document_kind)
  WHERE status = 'PENDING' AND document_kind IS NOT NULL;
