-- Re-apply province/city on matches (npm run apply:match-admin).
-- Canonical copy lives in 006_schema_matchmaking.sql. Pre-2025 GSO codes.

ALTER TABLE schema_matchmaking.matches
  ADD COLUMN IF NOT EXISTS province VARCHAR(5) NULL,
  ADD COLUMN IF NOT EXISTS city VARCHAR(5) NULL;

COMMENT ON COLUMN schema_matchmaking.matches.province IS
  'Pre-2025 tỉnh/TP GSO code (e.g. 79 = TP.HCM). Paired with city.';
COMMENT ON COLUMN schema_matchmaking.matches.city IS
  'Pre-2025 quận/huyện GSO code (e.g. 778 = Quận 7). Paired with province.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matches_admin_pair'
      AND conrelid = 'schema_matchmaking.matches'::regclass
  ) THEN
    ALTER TABLE schema_matchmaking.matches
      ADD CONSTRAINT matches_admin_pair
      CHECK ((province IS NULL) = (city IS NULL));
  END IF;
END $$;

DROP INDEX IF EXISTS schema_matchmaking.idx_matches_province_city;
CREATE INDEX IF NOT EXISTS idx_matches_province_city
  ON schema_matchmaking.matches (province, city)
  WHERE province IS NOT NULL;
