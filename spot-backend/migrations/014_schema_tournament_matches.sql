-- 014 — tournament match schedule + results (T2)
-- Depends: 012_schema_tournaments.sql

CREATE TABLE IF NOT EXISTS schema_tournaments.tournament_matches (
  match_id SERIAL PRIMARY KEY,
  tournament_id INT NOT NULL
    REFERENCES schema_tournaments.tournaments(tournament_id) ON DELETE CASCADE,
  round VARCHAR(30) NOT NULL
    CHECK (round IN (
      'GROUP_STAGE',
      'ROUND_OF_32',
      'ROUND_OF_16',
      'QUARTER_FINAL',
      'SEMI_FINAL',
      'THIRD_PLACE',
      'FINAL'
    )),
  team_a_id INT NOT NULL
    REFERENCES schema_tournaments.tournament_teams(team_id) ON DELETE RESTRICT,
  team_b_id INT NOT NULL
    REFERENCES schema_tournaments.tournament_teams(team_id) ON DELETE RESTRICT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  team_a_goals INT NULL CHECK (team_a_goals IS NULL OR team_a_goals >= 0),
  team_b_goals INT NULL CHECK (team_b_goals IS NULL OR team_b_goals >= 0),
  sets_json JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tournament_matches_different_teams CHECK (team_a_id <> team_b_id),
  CONSTRAINT tournament_matches_football_or_badminton_result CHECK (
    (sets_json IS NULL AND (team_a_goals IS NOT NULL) = (team_b_goals IS NOT NULL))
    OR (team_a_goals IS NULL AND team_b_goals IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament_scheduled
  ON schema_tournaments.tournament_matches (tournament_id, scheduled_at ASC);

CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament_round
  ON schema_tournaments.tournament_matches (tournament_id, round);
