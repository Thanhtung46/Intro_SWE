-- 021 — province/city admin units on venues (referee Job Board location filter).
-- Depends: 004_schema_venue_booking_social.sql

ALTER TABLE schema_venue.venues
  ADD COLUMN IF NOT EXISTS province VARCHAR(5) NULL;

ALTER TABLE schema_venue.venues
  ADD COLUMN IF NOT EXISTS city VARCHAR(5) NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'venues_province_city_pair'
      AND conrelid = 'schema_venue.venues'::regclass
  ) THEN
    ALTER TABLE schema_venue.venues
      ADD CONSTRAINT venues_province_city_pair
      CHECK ((province IS NULL) = (city IS NULL));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_venues_province_city
  ON schema_venue.venues (province, city)
  WHERE province IS NOT NULL;
