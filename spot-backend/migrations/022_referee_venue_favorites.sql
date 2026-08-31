-- 022 — referee Job Board venue favourites (separate from match_favorites).
-- Depends: 016_schema_referee.sql, 004

CREATE TABLE IF NOT EXISTS schema_referee.referee_venue_favorites (
  referee_id INT NOT NULL
    REFERENCES schema_auth.users(user_id) ON DELETE CASCADE,
  venue_id INT NOT NULL
    REFERENCES schema_venue.venues(venue_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (referee_id, venue_id)
);

CREATE INDEX IF NOT EXISTS idx_referee_venue_favorites_venue
  ON schema_referee.referee_venue_favorites (venue_id);
