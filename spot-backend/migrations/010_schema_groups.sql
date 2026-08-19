-- 010 — sport groups / clubs. Depends: 001, 002, 006 (fold_search_text).
-- Independent from schema_matchmaking.matches (pickup kèo).

CREATE SCHEMA IF NOT EXISTS schema_groups;

CREATE TABLE IF NOT EXISTS schema_groups.groups (
  group_id SERIAL PRIMARY KEY,
  admin_user_id INT NOT NULL REFERENCES schema_auth.users(user_id) ON DELETE RESTRICT,
  sport VARCHAR(20) NOT NULL
    CHECK (sport IN ('BADMINTON', 'FOOTBALL')),
  name VARCHAR(150) NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NULL,
  logo_url VARCHAR(2048) NULL,
  cover_url VARCHAR(2048) NULL,
  venue_name VARCHAR(255) NOT NULL,
  venue_address VARCHAR(500) NOT NULL,
  province VARCHAR(5) NULL,
  city VARCHAR(5) NULL,
  venue_lat DOUBLE PRECISION NULL
    CHECK (venue_lat IS NULL OR (venue_lat >= -90 AND venue_lat <= 90)),
  venue_lng DOUBLE PRECISION NULL
    CHECK (venue_lng IS NULL OR (venue_lng >= -180 AND venue_lng <= 180)),
  skill_min VARCHAR(40) NOT NULL,
  skill_max VARCHAR(40) NOT NULL,
  skill_min_rank INT NOT NULL CHECK (skill_min_rank >= 1),
  skill_max_rank INT NOT NULL CHECK (skill_max_rank >= 1),
  all_levels BOOLEAN NOT NULL DEFAULT FALSE,
  join_mode VARCHAR(20) NOT NULL
    CHECK (join_mode IN ('AUTO', 'APPROVAL')),
  zalo_url VARCHAR(2048) NULL,
  member_count INT NOT NULL DEFAULT 1 CHECK (member_count >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT groups_venue_coords CHECK (
    (venue_lat IS NULL AND venue_lng IS NULL)
    OR (venue_lat IS NOT NULL AND venue_lng IS NOT NULL)
  ),
  CONSTRAINT groups_admin_pair CHECK (
    (province IS NULL) = (city IS NULL)
  ),
  CONSTRAINT groups_skill_rank_order CHECK (skill_min_rank <= skill_max_rank),
  CONSTRAINT groups_skill_codes CHECK (
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

CREATE INDEX IF NOT EXISTS idx_groups_sport_created
  ON schema_groups.groups (sport, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_groups_admin
  ON schema_groups.groups (admin_user_id);

CREATE INDEX IF NOT EXISTS idx_groups_province_city
  ON schema_groups.groups (province, city)
  WHERE province IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_groups_name_fold_trgm
  ON schema_groups.groups
  USING gin ((schema_matchmaking.fold_search_text(name)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_groups_venue_name_fold_trgm
  ON schema_groups.groups
  USING gin ((schema_matchmaking.fold_search_text(venue_name)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_groups_venue_address_fold_trgm
  ON schema_groups.groups
  USING gin ((schema_matchmaking.fold_search_text(venue_address)) gin_trgm_ops);

CREATE TABLE IF NOT EXISTS schema_groups.group_courts (
  court_id SERIAL PRIMARY KEY,
  group_id INT NOT NULL
    REFERENCES schema_groups.groups(group_id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_group_courts_group
  ON schema_groups.group_courts (group_id, sort_order);

CREATE TABLE IF NOT EXISTS schema_groups.group_schedule_slots (
  slot_id SERIAL PRIMARY KEY,
  group_id INT NOT NULL
    REFERENCES schema_groups.groups(group_id) ON DELETE CASCADE,
  court_id INT NOT NULL
    REFERENCES schema_groups.group_courts(court_id) ON DELETE CASCADE,
  day_of_week INT NOT NULL
    CHECK (day_of_week >= 1 AND day_of_week <= 7),
  start_time TIME NOT NULL,
  duration_minutes INT NOT NULL
    CHECK (duration_minutes >= 30 AND duration_minutes % 30 = 0),
  CONSTRAINT group_schedule_start_half_hour CHECK (
    EXTRACT(MINUTE FROM start_time)::int % 30 = 0
    AND EXTRACT(SECOND FROM start_time)::int = 0
  )
);

CREATE INDEX IF NOT EXISTS idx_group_schedule_group_day
  ON schema_groups.group_schedule_slots (group_id, day_of_week, start_time);

CREATE TABLE IF NOT EXISTS schema_groups.group_members (
  member_id SERIAL PRIMARY KEY,
  group_id INT NOT NULL
    REFERENCES schema_groups.groups(group_id) ON DELETE CASCADE,
  user_id INT NOT NULL
    REFERENCES schema_auth.users(user_id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL
    CHECK (role IN ('ADMIN', 'MEMBER')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (group_id, user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_group_members_one_admin
  ON schema_groups.group_members (group_id)
  WHERE role = 'ADMIN';

CREATE INDEX IF NOT EXISTS idx_group_members_user
  ON schema_groups.group_members (user_id);

CREATE TABLE IF NOT EXISTS schema_groups.group_join_requests (
  request_id SERIAL PRIMARY KEY,
  group_id INT NOT NULL
    REFERENCES schema_groups.groups(group_id) ON DELETE CASCADE,
  user_id INT NOT NULL
    REFERENCES schema_auth.users(user_id) ON DELETE CASCADE,
  message VARCHAR(500) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'KICKED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_group_join_requests_group_user
  ON schema_groups.group_join_requests (group_id, user_id);

CREATE INDEX IF NOT EXISTS idx_group_join_requests_group
  ON schema_groups.group_join_requests (group_id, status);

CREATE TABLE IF NOT EXISTS schema_groups.group_favorites (
  user_id INT NOT NULL
    REFERENCES schema_auth.users(user_id) ON DELETE CASCADE,
  group_id INT NOT NULL
    REFERENCES schema_groups.groups(group_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_group_favorites_group
  ON schema_groups.group_favorites (group_id);

CREATE TABLE IF NOT EXISTS schema_groups.group_gallery_images (
  image_id SERIAL PRIMARY KEY,
  group_id INT NOT NULL
    REFERENCES schema_groups.groups(group_id) ON DELETE CASCADE,
  image_url VARCHAR(2048) NOT NULL,
  uploaded_by INT NOT NULL
    REFERENCES schema_auth.users(user_id) ON DELETE RESTRICT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_group_gallery_group
  ON schema_groups.group_gallery_images (group_id, sort_order, created_at DESC);
