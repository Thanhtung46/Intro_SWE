-- 009 — Referee domain: profiles, venue pool, match assignments. Depends: 004.

CREATE SCHEMA IF NOT EXISTS schema_referee;

CREATE TABLE IF NOT EXISTS schema_referee.referee_profiles (
  user_id INT PRIMARY KEY REFERENCES schema_auth.users(user_id) ON DELETE CASCADE,
  certified_sport_types TEXT[] NOT NULL DEFAULT '{}',
  total_matches_officiated INT NOT NULL DEFAULT 0
    CHECK (total_matches_officiated >= 0),
  avg_rating NUMERIC(3, 2) NOT NULL DEFAULT 0
    CHECK (avg_rating >= 0 AND avg_rating <= 5),
  rating_count INT NOT NULL DEFAULT 0
    CHECK (rating_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schema_referee.referee_venue_registrations (
  registration_id SERIAL PRIMARY KEY,
  referee_id INT NOT NULL REFERENCES schema_auth.users(user_id) ON DELETE CASCADE,
  venue_id INT NOT NULL REFERENCES schema_venue.venues(venue_id) ON DELETE CASCADE,
  sport_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_at TIMESTAMPTZ NULL,
  UNIQUE (referee_id, venue_id, sport_type)
);

CREATE INDEX IF NOT EXISTS idx_referee_venue_reg_referee_status
  ON schema_referee.referee_venue_registrations (referee_id, status);

CREATE INDEX IF NOT EXISTS idx_referee_venue_reg_venue_sport
  ON schema_referee.referee_venue_registrations (venue_id, sport_type, status);

CREATE TABLE IF NOT EXISTS schema_referee.referee_assignments (
  assignment_id SERIAL PRIMARY KEY,
  booking_id INT NOT NULL REFERENCES schema_booking.bookings(booking_id) ON DELETE CASCADE,
  venue_id INT NOT NULL REFERENCES schema_venue.venues(venue_id) ON DELETE CASCADE,
  referee_id INT NOT NULL REFERENCES schema_auth.users(user_id) ON DELETE CASCADE,
  fee_vnd DECIMAL(10, 2) NOT NULL CHECK (fee_vnd >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'COMPLETED')),
  source VARCHAR(20) NOT NULL DEFAULT 'HIRE_REFEREE'
    CHECK (source IN ('HIRE_REFEREE')),
  accepted_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  decline_reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (booking_id, referee_id)
);

CREATE INDEX IF NOT EXISTS idx_referee_assignments_referee_status
  ON schema_referee.referee_assignments (referee_id, status);

CREATE INDEX IF NOT EXISTS idx_referee_assignments_booking
  ON schema_referee.referee_assignments (booking_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_accepted_referee_per_booking
  ON schema_referee.referee_assignments (booking_id)
  WHERE status = 'ACCEPTED';

ALTER TABLE schema_booking.bookings
  ADD COLUMN IF NOT EXISTS hire_referee BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS referee_fee_vnd DECIMAL(10, 2) NULL
    CHECK (referee_fee_vnd IS NULL OR referee_fee_vnd >= 0);
