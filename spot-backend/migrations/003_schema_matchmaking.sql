-- Pickup matches (kèo) — free listing, no booking_id.
-- Courts, join requests, guests, favorites, venue + optional map coords.
-- Search: pg_trgm + fold_search_text (Vietnamese unaccent; no Geoapify).

CREATE SCHEMA IF NOT EXISTS schema_matchmaking;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS schema_matchmaking.matches (
  match_id SERIAL PRIMARY KEY,
  host_user_id INT NOT NULL REFERENCES schema_auth.users(user_id) ON DELETE CASCADE,
  sport VARCHAR(20) NOT NULL
    CHECK (sport IN ('BADMINTON', 'FOOTBALL')),
  format VARCHAR(30) NOT NULL,
  title VARCHAR(150) NOT NULL,
  notes TEXT NULL,
  cover_url VARCHAR(2048) NULL,
  venue_name VARCHAR(255) NOT NULL,
  venue_address VARCHAR(500) NOT NULL,
  province VARCHAR(5) NULL,
  city VARCHAR(5) NULL,
  venue_lat DOUBLE PRECISION NULL
    CHECK (venue_lat IS NULL OR (venue_lat >= -90 AND venue_lat <= 90)),
  venue_lng DOUBLE PRECISION NULL
    CHECK (venue_lng IS NULL OR (venue_lng >= -180 AND venue_lng <= 180)),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_multi_day BOOLEAN NOT NULL DEFAULT FALSE,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  max_players INT NOT NULL CHECK (max_players >= 2 AND max_players <= 40),
  filled_count INT NOT NULL DEFAULT 1 CHECK (filled_count >= 0),
  skill_min VARCHAR(40) NOT NULL,
  skill_max VARCHAR(40) NOT NULL,
  skill_min_rank INT NOT NULL CHECK (skill_min_rank >= 1),
  skill_max_rank INT NOT NULL CHECK (skill_max_rank >= 1),
  all_levels BOOLEAN NOT NULL DEFAULT FALSE,
  fee_type VARCHAR(20) NOT NULL
    CHECK (fee_type IN ('GENDER_RANGE', 'SPLIT_EVENLY')),
  price_min INT NULL CHECK (price_min IS NULL OR price_min >= 0),
  price_max INT NULL CHECK (price_max IS NULL OR price_max >= 0),
  join_mode VARCHAR(20) NOT NULL
    CHECK (join_mode IN ('AUTO', 'APPROVAL')),
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'FULL', 'COMPLETED', 'CANCELLED')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT matches_venue_coords CHECK (
    (venue_lat IS NULL AND venue_lng IS NULL)
    OR (venue_lat IS NOT NULL AND venue_lng IS NOT NULL)
  ),
  CONSTRAINT matches_admin_pair CHECK (
    (province IS NULL) = (city IS NULL)
  ),
  CONSTRAINT matches_time_order CHECK (ends_at > starts_at),
  CONSTRAINT matches_skill_rank_order CHECK (skill_min_rank <= skill_max_rank),
  CONSTRAINT matches_capacity CHECK (filled_count <= max_players),
  CONSTRAINT matches_format_matches_sport CHECK (
    (sport = 'BADMINTON' AND format IN ('SINGLES', 'DOUBLES'))
    OR (
      sport = 'FOOTBALL'
      AND format IN ('FIVE_A_SIDE', 'SEVEN_A_SIDE', 'ELEVEN_A_SIDE')
    )
  ),
  CONSTRAINT matches_fee_prices CHECK (
    (
      fee_type = 'GENDER_RANGE'
      AND price_min IS NOT NULL
      AND price_max IS NOT NULL
      AND price_max >= price_min
    )
    OR (
      fee_type = 'SPLIT_EVENLY'
      AND price_min IS NOT NULL
      AND price_min >= 1
      AND price_max IS NULL
    )
  ),
  CONSTRAINT matches_skill_codes CHECK (
    (
      sport = 'BADMINTON'
      AND skill_min IN (
        'BEGINNER_MINUS',
        'BEGINNER',
        'BEGINNER_PLUS',
        'LOW_AVERAGE',
        'AVERAGE_MINUS',
        'AVERAGE',
        'AVERAGE_PLUS',
        'FAIR',
        'SEMI_PRO',
        'PROFESSIONAL'
      )
      AND skill_max IN (
        'BEGINNER_MINUS',
        'BEGINNER',
        'BEGINNER_PLUS',
        'LOW_AVERAGE',
        'AVERAGE_MINUS',
        'AVERAGE',
        'AVERAGE_PLUS',
        'FAIR',
        'SEMI_PRO',
        'PROFESSIONAL'
      )
    )
    OR (
      sport = 'FOOTBALL'
      AND skill_min IN (
        'LEARNING',
        'REC_BASIC',
        'REC_ADVANCED',
        'SEMI_PRO',
        'PROFESSIONAL',
        'ELITE'
      )
      AND skill_max IN (
        'LEARNING',
        'REC_BASIC',
        'REC_ADVANCED',
        'SEMI_PRO',
        'PROFESSIONAL',
        'ELITE'
      )
    )
  )
);

CREATE TABLE IF NOT EXISTS schema_matchmaking.match_courts (
  court_id SERIAL PRIMARY KEY,
  match_id INT NOT NULL
    REFERENCES schema_matchmaking.matches(match_id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_matches_sport_starts
  ON schema_matchmaking.matches (sport, starts_at);

CREATE INDEX IF NOT EXISTS idx_matches_status_ends
  ON schema_matchmaking.matches (status, ends_at);

CREATE INDEX IF NOT EXISTS idx_matches_host
  ON schema_matchmaking.matches (host_user_id);

CREATE INDEX IF NOT EXISTS idx_matches_listable_starts
  ON schema_matchmaking.matches (starts_at)
  WHERE status IN ('OPEN', 'FULL');

CREATE INDEX IF NOT EXISTS idx_match_courts_match
  ON schema_matchmaking.match_courts (match_id, sort_order);

CREATE TABLE IF NOT EXISTS schema_matchmaking.match_join_requests (
  request_id SERIAL PRIMARY KEY,
  match_id INT NOT NULL
    REFERENCES schema_matchmaking.matches(match_id) ON DELETE CASCADE,
  user_id INT NOT NULL
    REFERENCES schema_auth.users(user_id) ON DELETE CASCADE,
  message VARCHAR(500) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'KICKED')),
  skill_warning BOOLEAN NOT NULL DEFAULT FALSE,
  heads INT NOT NULL CHECK (heads >= 1),
  share_amount INT NULL CHECK (share_amount IS NULL OR share_amount >= 0),
  payment_status VARCHAR(20) NULL
    CHECK (payment_status IS NULL OR payment_status = 'SUCCESS'),
  contact_phone VARCHAR(15) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_join_requests_match_user
  ON schema_matchmaking.match_join_requests (match_id, user_id);

CREATE INDEX IF NOT EXISTS idx_join_requests_match
  ON schema_matchmaking.match_join_requests (match_id, status);

CREATE TABLE IF NOT EXISTS schema_matchmaking.match_guests (
  guest_id SERIAL PRIMARY KEY,
  request_id INT NOT NULL
    REFERENCES schema_matchmaking.match_join_requests(request_id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  skill VARCHAR(40) NOT NULL,
  gender VARCHAR(20) NOT NULL
    CHECK (gender IN ('female', 'male')),
  phone VARCHAR(15) NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_match_guests_request
  ON schema_matchmaking.match_guests (request_id, sort_order);

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

CREATE INDEX IF NOT EXISTS idx_matches_province_city
  ON schema_matchmaking.matches (province, city)
  WHERE province IS NOT NULL;

CREATE OR REPLACE FUNCTION schema_matchmaking.fold_search_text(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT btrim(regexp_replace(
    lower(translate(
      regexp_replace(normalize(input, NFD), U&'[\0300-\036F]', '', 'g'),
      'đĐ',
      'dd'
    )),
    '\s+',
    ' ',
    'g'
  ))
$$;

COMMENT ON FUNCTION schema_matchmaking.fold_search_text(text) IS
  'Lowercase, strip Vietnamese diacritics and đ. Used by GET /matches?location=.';

CREATE INDEX IF NOT EXISTS idx_matches_title_fold_trgm
  ON schema_matchmaking.matches
  USING gin ((schema_matchmaking.fold_search_text(title)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_matches_venue_name_fold_trgm
  ON schema_matchmaking.matches
  USING gin ((schema_matchmaking.fold_search_text(venue_name)) gin_trgm_ops);
