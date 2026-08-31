-- 009 — pickup kèo: participant rates host after completed match.
-- Depends: 005_schema_review.sql, 006_schema_matchmaking.sql

CREATE TABLE IF NOT EXISTS schema_review.match_host_reviews (
  review_id SERIAL PRIMARY KEY,
  match_id INT NOT NULL
    REFERENCES schema_matchmaking.matches(match_id) ON DELETE CASCADE,
  reviewer_user_id INT NOT NULL
    REFERENCES schema_auth.users(user_id) ON DELETE RESTRICT,
  host_user_id INT NOT NULL
    REFERENCES schema_auth.users(user_id) ON DELETE RESTRICT,
  rating INT NOT NULL
    CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT match_host_reviews_match_reviewer_unique UNIQUE (match_id, reviewer_user_id)
);

CREATE INDEX IF NOT EXISTS idx_match_host_reviews_host
  ON schema_review.match_host_reviews (host_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_match_host_reviews_match
  ON schema_review.match_host_reviews (match_id);

CREATE INDEX IF NOT EXISTS idx_match_host_reviews_reviewer
  ON schema_review.match_host_reviews (reviewer_user_id, created_at DESC);
