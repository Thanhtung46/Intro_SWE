-- Live DB one-shot (001/003 already in schema_migrations).
ALTER TABLE schema_auth.user_profiles
  ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(2048) NULL;

ALTER TABLE schema_matchmaking.matches
  ADD COLUMN IF NOT EXISTS cover_url VARCHAR(2048) NULL;

CREATE TABLE IF NOT EXISTS schema_matchmaking.match_favorites (
  user_id INT NOT NULL
    REFERENCES schema_auth.users(user_id) ON DELETE CASCADE,
  match_id INT NOT NULL
    REFERENCES schema_matchmaking.matches(match_id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, match_id)
);

CREATE INDEX IF NOT EXISTS idx_match_favorites_match
  ON schema_matchmaking.match_favorites (match_id);
