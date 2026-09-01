-- 027 — per-field (court) photo gallery, so each field inside a venue can
-- carry its own photos for players to pick from (not just one gallery per
-- venue). Same convention as 007_schema_venue_images.sql: image_url is
-- FE-uploaded (Supabase Storage) and posted as a URL — no BE file upload.
-- Depends: 004.

CREATE TABLE IF NOT EXISTS schema_venue.field_images (
  image_id SERIAL PRIMARY KEY,
  field_id INT NOT NULL REFERENCES schema_venue.fields(field_id) ON DELETE CASCADE,
  image_url VARCHAR(2048) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_field_images_field
  ON schema_venue.field_images (field_id, display_order);
