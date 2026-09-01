-- 023 — GIN trigram indexes on venue name/address for referee Job Board search (q=).
-- Depends: 004, 006 (pg_trgm + fold_search_text).

CREATE INDEX IF NOT EXISTS idx_venues_name_fold_trgm
  ON schema_venue.venues
  USING gin ((schema_matchmaking.fold_search_text(name)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_venues_address_fold_trgm
  ON schema_venue.venues
  USING gin ((schema_matchmaking.fold_search_text(address)) gin_trgm_ops);
