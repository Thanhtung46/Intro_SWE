-- Live DB one-shot (venues already created before this feature's columns
-- were added to migrations/004_schema_venue_booking_social.sql).
CREATE EXTENSION IF NOT EXISTS postgis;

-- opening_hours may already exist as the pre-refactor VARCHAR(100) range
-- string ("06:00-23:00"); converting to TIME can't recover that shape, so
-- any existing value is dropped (set NULL) rather than guessed at.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'schema_venue' AND table_name = 'venues'
      AND column_name = 'opening_hours' AND data_type <> 'time without time zone'
  ) THEN
    ALTER TABLE schema_venue.venues
      ALTER COLUMN opening_hours TYPE TIME USING NULL;
  END IF;
END $$;

ALTER TABLE schema_venue.venues
  ADD COLUMN IF NOT EXISTS opening_hours TIME NULL;

ALTER TABLE schema_venue.venues
  ADD COLUMN IF NOT EXISTS closing_hours TIME NULL;

ALTER TABLE schema_venue.venues
  ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326) NULL;

CREATE INDEX IF NOT EXISTS idx_venues_location
  ON schema_venue.venues USING GIST (location);
