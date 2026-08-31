-- 007 — venue photo gallery. Depends: 004.
-- image_url is FE-uploaded (Supabase Storage) and posted as a URL, same
-- convention as coverUrl/avatarUrl elsewhere — no BE file upload.

CREATE TABLE IF NOT EXISTS schema_venue.venue_images (
  image_id SERIAL PRIMARY KEY,
  venue_id INT NOT NULL REFERENCES schema_venue.venues(venue_id) ON DELETE CASCADE,
  image_url VARCHAR(2048) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_venue_images_venue
  ON schema_venue.venue_images (venue_id, display_order);
