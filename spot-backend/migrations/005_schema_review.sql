-- 005 — venue reviews + owner replies. Depends: 001, 004.
-- One review per booking.

CREATE SCHEMA IF NOT EXISTS schema_review;

CREATE TABLE IF NOT EXISTS schema_review.reviews (
  review_id SERIAL PRIMARY KEY,
  booking_id INT NOT NULL UNIQUE
    REFERENCES schema_booking.bookings(booking_id) ON DELETE CASCADE,
  venue_id INT NOT NULL
    REFERENCES schema_venue.venues(venue_id) ON DELETE CASCADE,
  player_id INT NOT NULL
    REFERENCES schema_auth.users(user_id) ON DELETE RESTRICT,
  rating INT NOT NULL
    CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_venue_created
  ON schema_review.reviews (venue_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_player
  ON schema_review.reviews (player_id);

CREATE TABLE IF NOT EXISTS schema_review.review_replies (
  reply_id SERIAL PRIMARY KEY,
  review_id INT NOT NULL
    REFERENCES schema_review.reviews(review_id) ON DELETE CASCADE,
  owner_id INT NOT NULL
    REFERENCES schema_auth.users(user_id) ON DELETE RESTRICT,
  reply_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_review_replies_one_per_review
  ON schema_review.review_replies (review_id);

CREATE INDEX IF NOT EXISTS idx_review_replies_owner
  ON schema_review.review_replies (owner_id);
