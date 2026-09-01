// Filter sheet output (Figma node 87:1903) — maps 1:1 onto matchService's
// ListMatchesQuery fields except sport (owned by the Homepage screen's own
// toggle, not part of this sheet).
import type { MatchFormat } from '@/types/match';

export type MatchFilters = {
  date?: string; // YYYY-MM-DD
  timeFrom?: string; // HH:mm
  timeTo?: string; // HH:mm
  skill: string[];
  /** Match format codes for current sport (Singles/Doubles or 5v5/7v7/11v11). */
  format: MatchFormat[];
  priceMin?: number; // VND
  priceMax?: number; // VND
  // Location mode — province/city (VN admin-unit codes, see @/types/geo)
  // now that spot-backend ships GET /geo/vn (SPOT-76 plan mục 2.1, resolved
  // via commit 84474d2). `city` requires `province`.
  province?: string;
  city?: string;
  favorited?: boolean;
  // Distance mode — mutually exclusive with the free-text search bar's
  // `location` at the API level; all three must be set together. Mirrors
  // GroupFilters/TournamentFilters (expo-location, 1-20km).
  latitude?: number;
  longitude?: number;
  radiusKm?: number; // 1-20
};

export const EMPTY_MATCH_FILTERS: MatchFilters = { skill: [], format: [] };
