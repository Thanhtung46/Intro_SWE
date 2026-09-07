-- 030 — recommendation outcome logging (schema_recommendation).
--
-- Purpose: capture what GET /recommendations showed a user and what they
-- did about it, so there is finally labeled data to train a real model on
-- (today's spot-ai-services/recommendation is a hand-weighted heuristic —
-- see services/scoring.py — precisely because no outcome data exists yet).
--
-- Ownership: spot-ai-services/recommendation stays read-only against this
-- DB (research.md decision 3 in that service) — it never writes here.
-- spot-backend, which already proxies GET /recommendations to that service
-- (see spot-ai-services/recommendation/services/candidates.py's note on the
-- 3s proxy timeout), is the one that inserts a request + its impressions
-- right after relaying the AI service's response back to the FE. Interaction
-- rows are written by spot-backend too: BOOKING_CREATED is inferred inside
-- the existing booking-creation flow (no new FE call needed); CLICK needs a
-- new lightweight endpoint the FE calls on tap (out of scope for this
-- migration — schema only).
--
-- Depends: 001 (schema_auth.users), 004 (schema_venue.venues,
-- schema_booking.bookings).

CREATE SCHEMA IF NOT EXISTS schema_recommendation;

-- One row per GET /recommendations call — the request context every
-- impression in that call shares (so training can reconstruct "what did
-- the user ask for", not just "what was shown").
CREATE TABLE IF NOT EXISTS schema_recommendation.recommendation_requests (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INT NOT NULL REFERENCES schema_auth.users(user_id) ON DELETE CASCADE,
  sport VARCHAR(20) NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  radius_km DOUBLE PRECISION,
  -- Mirrors services/scoring.py's `fallback` flag (True = cold-start /
  -- no-history-match, popularity+proximity-only ranking) — needed so
  -- training can tell "personalized" and "fallback" impressions apart
  -- rather than treating them as the same kind of evidence.
  fallback BOOLEAN NOT NULL DEFAULT FALSE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recommendation_requests_user
  ON schema_recommendation.recommendation_requests (user_id, requested_at DESC);

-- One row per venue shown within a request — the actual candidate list +
-- its rank + the raw (pre-normalize) feature values services/scoring.py
-- computed for it. Storing the raw features, not just the final cosine
-- score, is what makes this reusable as ML training features later instead
-- of only "was this heuristic score right or wrong".
CREATE TABLE IF NOT EXISTS schema_recommendation.recommendation_impressions (
  impression_id BIGSERIAL PRIMARY KEY,
  request_id UUID NOT NULL
    REFERENCES schema_recommendation.recommendation_requests(request_id) ON DELETE CASCADE,
  venue_id INT NOT NULL REFERENCES schema_venue.venues(venue_id) ON DELETE CASCADE,
  rank_position SMALLINT NOT NULL, -- 1-based position in the returned list
  score DOUBLE PRECISION NOT NULL, -- final cosine-similarity score (services/scoring.py)
  history_affinity_raw DOUBLE PRECISION,
  proximity_raw DOUBLE PRECISION,
  popularity_raw DOUBLE PRECISION,
  distance_km DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (request_id, venue_id)
);

CREATE INDEX IF NOT EXISTS idx_recommendation_impressions_request
  ON schema_recommendation.recommendation_impressions (request_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_impressions_venue
  ON schema_recommendation.recommendation_impressions (venue_id);

-- What the user actually did about one impression — this table's rows ARE
-- the training labels. CLICK needs an explicit FE call (tap on a
-- recommended VenueCard); BOOKING_CREATED is written server-side by the
-- booking-creation flow when it finds a recent impression for the same
-- user/venue, so a real booking outcome is captured with no FE change.
CREATE TABLE IF NOT EXISTS schema_recommendation.recommendation_interactions (
  interaction_id BIGSERIAL PRIMARY KEY,
  impression_id BIGINT NOT NULL
    REFERENCES schema_recommendation.recommendation_impressions(impression_id) ON DELETE CASCADE,
  interaction_type VARCHAR(20) NOT NULL
    CHECK (interaction_type IN ('CLICK', 'BOOKING_CREATED')),
  booking_id INT NULL REFERENCES schema_booking.bookings(booking_id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- One CLICK and one BOOKING_CREATED per impression is enough signal;
  -- repeated identical events (e.g. double-tap) aren't additional evidence.
  UNIQUE (impression_id, interaction_type)
);

CREATE INDEX IF NOT EXISTS idx_recommendation_interactions_impression
  ON schema_recommendation.recommendation_interactions (impression_id);
