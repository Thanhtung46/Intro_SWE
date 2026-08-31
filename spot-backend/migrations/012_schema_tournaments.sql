-- 012 — sport tournaments (giải đấu). Depends: 001, 006 (fold_search_text).
-- Independent from schema_matchmaking.matches and schema_groups.

CREATE SCHEMA IF NOT EXISTS schema_tournaments;

CREATE TABLE IF NOT EXISTS schema_tournaments.tournaments (
  tournament_id SERIAL PRIMARY KEY,
  organizer_user_id INT NOT NULL REFERENCES schema_auth.users(user_id) ON DELETE RESTRICT,
  sport VARCHAR(20) NOT NULL
    CHECK (sport IN ('BADMINTON', 'FOOTBALL')),
  format VARCHAR(30) NOT NULL,
  gender_division VARCHAR(10) NULL
    CHECK (gender_division IS NULL OR gender_division IN ('MEN', 'WOMEN')),
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  cover_url VARCHAR(2048) NOT NULL,
  venue_name VARCHAR(255) NOT NULL,
  venue_address VARCHAR(500) NOT NULL,
  province VARCHAR(5) NOT NULL,
  city VARCHAR(5) NOT NULL,
  venue_lat DOUBLE PRECISION NOT NULL
    CHECK (venue_lat >= -90 AND venue_lat <= 90),
  venue_lng DOUBLE PRECISION NOT NULL
    CHECK (venue_lng >= -180 AND venue_lng <= 180),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  registration_deadline TIMESTAMPTZ NOT NULL,
  max_teams INT NOT NULL CHECK (max_teams >= 2 AND max_teams <= 128),
  accepted_team_count INT NOT NULL DEFAULT 0 CHECK (accepted_team_count >= 0),
  registration_fee_vnd BIGINT NOT NULL CHECK (registration_fee_vnd >= 0),
  prize_pool_vnd BIGINT NOT NULL CHECK (prize_pool_vnd >= 0),
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN_REGISTRATION'
    CHECK (status IN (
      'OPEN_REGISTRATION',
      'FULL',
      'ACTIVE',
      'COMPLETED',
      'CANCELLED'
    )),
  hosted_by_label VARCHAR(20) NOT NULL DEFAULT 'SPOT',
  winners_json JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tournaments_admin_pair CHECK (
    (province IS NULL) = (city IS NULL)
  ),
  CONSTRAINT tournaments_time_order CHECK (ends_at >= starts_at),
  CONSTRAINT tournaments_registration_before_start CHECK (
    registration_deadline <= starts_at
  ),
  CONSTRAINT tournaments_accepted_lte_max CHECK (
    accepted_team_count <= max_teams
  ),
  CONSTRAINT tournaments_football_format CHECK (
    sport <> 'FOOTBALL'
    OR format IN ('FIVE_A_SIDE', 'SEVEN_A_SIDE', 'ELEVEN_A_SIDE')
  ),
  CONSTRAINT tournaments_badminton_format CHECK (
    sport <> 'BADMINTON'
    OR format IN ('MS', 'WS', 'MD', 'WD', 'MIXED')
  ),
  CONSTRAINT tournaments_football_gender CHECK (
    sport <> 'FOOTBALL' OR gender_division IS NOT NULL
  ),
  CONSTRAINT tournaments_badminton_gender CHECK (
    sport <> 'BADMINTON' OR gender_division IS NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_tournaments_sport_created
  ON schema_tournaments.tournaments (sport, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tournaments_status
  ON schema_tournaments.tournaments (status);

CREATE INDEX IF NOT EXISTS idx_tournaments_organizer
  ON schema_tournaments.tournaments (organizer_user_id);

CREATE INDEX IF NOT EXISTS idx_tournaments_province_city
  ON schema_tournaments.tournaments (province, city)
  WHERE province IS NOT NULL;

CREATE TABLE IF NOT EXISTS schema_tournaments.tournament_join_requests (
  request_id SERIAL PRIMARY KEY,
  tournament_id INT NOT NULL REFERENCES schema_tournaments.tournaments(tournament_id) ON DELETE CASCADE,
  captain_user_id INT NOT NULL REFERENCES schema_auth.users(user_id) ON DELETE CASCADE,
  team_name VARCHAR(150) NOT NULL,
  team_logo_url VARCHAR(2048) NOT NULL,
  roster_json JSONB NOT NULL,
  status VARCHAR(20) NOT NULL
    CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'KICKED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tournament_join_requests_unique_captain UNIQUE (tournament_id, captain_user_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_join_requests_tournament_status
  ON schema_tournaments.tournament_join_requests (tournament_id, status);

CREATE TABLE IF NOT EXISTS schema_tournaments.tournament_teams (
  team_id SERIAL PRIMARY KEY,
  tournament_id INT NOT NULL REFERENCES schema_tournaments.tournaments(tournament_id) ON DELETE CASCADE,
  captain_user_id INT NOT NULL REFERENCES schema_auth.users(user_id) ON DELETE RESTRICT,
  join_request_id INT NULL REFERENCES schema_tournaments.tournament_join_requests(request_id) ON DELETE SET NULL,
  team_name VARCHAR(150) NOT NULL,
  team_logo_url VARCHAR(2048) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tournament_teams_unique_captain UNIQUE (tournament_id, captain_user_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_teams_tournament
  ON schema_tournaments.tournament_teams (tournament_id);

CREATE TABLE IF NOT EXISTS schema_tournaments.tournament_roster_players (
  roster_player_id SERIAL PRIMARY KEY,
  team_id INT NOT NULL REFERENCES schema_tournaments.tournament_teams(team_id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  jersey_number INT NULL CHECK (jersey_number IS NULL OR (jersey_number >= 0 AND jersey_number <= 999)),
  sort_order INT NOT NULL DEFAULT 0,
  rank INT NULL CHECK (rank IS NULL OR rank >= 1),
  CONSTRAINT tournament_roster_players_unique_jersey UNIQUE (team_id, jersey_number)
);

CREATE INDEX IF NOT EXISTS idx_tournament_roster_players_team
  ON schema_tournaments.tournament_roster_players (team_id);

CREATE TABLE IF NOT EXISTS schema_tournaments.tournament_favorites (
  user_id INT NOT NULL REFERENCES schema_auth.users(user_id) ON DELETE CASCADE,
  tournament_id INT NOT NULL REFERENCES schema_tournaments.tournaments(tournament_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, tournament_id)
);
