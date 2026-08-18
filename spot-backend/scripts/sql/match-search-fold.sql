-- Re-apply search fold + GIN (npm run apply:match-search).
-- Canonical copy lives in 006_schema_matchmaking.sql.

CREATE SCHEMA IF NOT EXISTS schema_matchmaking;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

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

CREATE INDEX IF NOT EXISTS idx_matches_listable_starts
  ON schema_matchmaking.matches (starts_at)
  WHERE status IN ('OPEN', 'FULL');

CREATE INDEX IF NOT EXISTS idx_matches_title_fold_trgm
  ON schema_matchmaking.matches
  USING gin ((schema_matchmaking.fold_search_text(title)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_matches_venue_name_fold_trgm
  ON schema_matchmaking.matches
  USING gin ((schema_matchmaking.fold_search_text(venue_name)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_matches_venue_address_fold_trgm
  ON schema_matchmaking.matches
  USING gin ((schema_matchmaking.fold_search_text(venue_address)) gin_trgm_ops);
