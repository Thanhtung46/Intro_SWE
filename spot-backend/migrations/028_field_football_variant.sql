-- Distinguishes "sân 5" (5-a-side) from "sân 7" (7-a-side) football courts,
-- which previously shared a single "Football" sport_type. Nullable and
-- unused for badminton fields.
ALTER TABLE schema_venue.fields
  ADD COLUMN IF NOT EXISTS football_variant VARCHAR(20);

ALTER TABLE schema_venue.fields
  DROP CONSTRAINT IF EXISTS fields_football_variant_check;

ALTER TABLE schema_venue.fields
  ADD CONSTRAINT fields_football_variant_check
  CHECK (football_variant IS NULL OR football_variant IN ('FIVE_A_SIDE', 'SEVEN_A_SIDE'));
