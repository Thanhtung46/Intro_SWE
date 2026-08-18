-- Venue + booking + social matches (squashed).
-- booking_time_range is tstzrange for Asia/Bangkok-safe bounds.
-- location is PostGIS geography(Point) for distance search.

CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE SCHEMA IF NOT EXISTS schema_venue;
CREATE SCHEMA IF NOT EXISTS schema_booking;
CREATE SCHEMA IF NOT EXISTS schema_social;

CREATE TABLE IF NOT EXISTS schema_venue.venues (
  venue_id SERIAL PRIMARY KEY,
  owner_id INT NOT NULL REFERENCES schema_auth.users(user_id) ON DELETE RESTRICT,
  name VARCHAR(150) NOT NULL,
  address TEXT NOT NULL,
  amenities TEXT NULL,
  opening_hours TIME NULL,
  closing_hours TIME NULL,
  location GEOGRAPHY(POINT, 4326) NULL,
  avg_rating NUMERIC(3, 2) NOT NULL DEFAULT 0
    CHECK (avg_rating >= 0 AND avg_rating <= 5),
  rating_count INT NOT NULL DEFAULT 0
    CHECK (rating_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_venues_owner
  ON schema_venue.venues (owner_id);

CREATE INDEX IF NOT EXISTS idx_venues_location
  ON schema_venue.venues USING GIST (location);

CREATE TABLE IF NOT EXISTS schema_venue.fields (
  field_id SERIAL PRIMARY KEY,
  venue_id INT NOT NULL REFERENCES schema_venue.venues(venue_id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  sport_type VARCHAR(50) NOT NULL,
  price_per_hour DECIMAL(10, 2) NOT NULL
    CHECK (price_per_hour > 0),
  capacity INT NOT NULL DEFAULT 10,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fields_venue
  ON schema_venue.fields (venue_id);

CREATE TABLE IF NOT EXISTS schema_booking.bookings (
  booking_id SERIAL PRIMARY KEY,
  player_id INT NOT NULL REFERENCES schema_auth.users(user_id) ON DELETE RESTRICT,
  field_id INT NOT NULL REFERENCES schema_venue.fields(field_id) ON DELETE RESTRICT,
  booking_date DATE NOT NULL,
  booking_time_range TSTZRANGE NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL
    CHECK (total_amount >= 0),
  deposit_amount DECIMAL(10, 2) NOT NULL
    CHECK (deposit_amount >= 0),
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING_PAYMENT'
    CHECK (status IN (
      'PENDING_PAYMENT',
      'PAID',
      'CHECKED_IN',
      'NO_SHOW',
      'COMPLETED',
      'CANCELLED'
    )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  EXCLUDE USING gist (
    field_id WITH =,
    booking_time_range WITH &&
  )
);

CREATE INDEX IF NOT EXISTS idx_bookings_player_date
  ON schema_booking.bookings (player_id, booking_date);

CREATE INDEX IF NOT EXISTS idx_bookings_time_lower
  ON schema_booking.bookings (lower(booking_time_range));

CREATE TABLE IF NOT EXISTS schema_social.matches (
  match_id SERIAL PRIMARY KEY,
  host_id INT NOT NULL REFERENCES schema_auth.users(user_id) ON DELETE RESTRICT,
  booking_id INT NOT NULL REFERENCES schema_booking.bookings(booking_id) ON DELETE CASCADE,
  sport_type VARCHAR(50) NOT NULL,
  max_players INT NOT NULL
    CHECK (max_players > 0),
  price_per_player DECIMAL(10, 2) NOT NULL DEFAULT 0.00
    CHECK (price_per_player >= 0),
  required_skill VARCHAR(20) NOT NULL DEFAULT 'BEGINNER'
    CHECK (required_skill IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_matches_host
  ON schema_social.matches (host_id);

CREATE INDEX IF NOT EXISTS idx_matches_booking
  ON schema_social.matches (booking_id);

CREATE TABLE IF NOT EXISTS schema_social.match_participants (
  participant_id SERIAL PRIMARY KEY,
  match_id INT NOT NULL REFERENCES schema_social.matches(match_id) ON DELETE CASCADE,
  player_id INT NOT NULL REFERENCES schema_auth.users(user_id) ON DELETE RESTRICT,
  join_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (join_status IN ('PENDING', 'APPROVED', 'REJECTED', 'KICKED')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (match_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_match_participants_player_status
  ON schema_social.match_participants (player_id, join_status);

ALTER TABLE schema_notification.reminder_jobs
  DROP CONSTRAINT IF EXISTS reminder_jobs_booking_id_fkey;

ALTER TABLE schema_notification.reminder_jobs
  ADD CONSTRAINT reminder_jobs_booking_id_fkey
  FOREIGN KEY (booking_id)
  REFERENCES schema_booking.bookings(booking_id)
  ON DELETE SET NULL;
