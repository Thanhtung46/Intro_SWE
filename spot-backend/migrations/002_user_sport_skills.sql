-- 002 — player skill per sport. Depends: 001.
-- At most one row per (user, sport). SEMI_PRO / PROFESSIONAL exist on both ladders.

CREATE TABLE IF NOT EXISTS schema_auth.user_sport_skills (
  user_id INT NOT NULL REFERENCES schema_auth.users(user_id) ON DELETE CASCADE,
  sport VARCHAR(20) NOT NULL
    CHECK (sport IN ('BADMINTON', 'FOOTBALL')),
  skill_level VARCHAR(40) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, sport),
  CONSTRAINT user_sport_skills_level_matches_sport CHECK (
    (
      sport = 'BADMINTON'
      AND skill_level IN (
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
      AND skill_level IN (
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
