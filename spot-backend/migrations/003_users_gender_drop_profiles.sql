-- Move gender onto users and drop user_profiles (idempotent).

ALTER TABLE schema_auth.users
  ADD COLUMN IF NOT EXISTS gender VARCHAR(30);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'schema_auth'
      AND table_name = 'user_profiles'
  ) THEN
    UPDATE schema_auth.users u
    SET gender = p.gender
    FROM schema_auth.user_profiles p
    WHERE u.user_id = p.user_id
      AND u.gender IS NULL;
  END IF;
END $$;

UPDATE schema_auth.users
SET gender = 'prefer_not_to_say'
WHERE gender IS NULL;

ALTER TABLE schema_auth.users
  ALTER COLUMN gender SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_gender_check'
      AND conrelid = 'schema_auth.users'::regclass
  ) THEN
    ALTER TABLE schema_auth.users
      ADD CONSTRAINT users_gender_check
      CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));
  END IF;
END $$;

DROP TABLE IF EXISTS schema_auth.user_profiles CASCADE;
