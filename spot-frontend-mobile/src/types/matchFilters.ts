// Filter sheet output (Figma node 87:1903) — maps 1:1 onto matchService's
// ListMatchesQuery fields except sport (owned by the Homepage screen's own
// toggle, not part of this sheet) and radiusKm (blocked — needs
// expo-location, not installed; see FilterSheet.tsx's Distance section
// comment, SPOT-76 plan mục 2.1).
export type MatchFilters = {
  date?: string; // YYYY-MM-DD
  timeFrom?: string; // HH:mm
  timeTo?: string; // HH:mm
  skill: string[];
  priceMin?: number; // VND
  priceMax?: number; // VND
  // Location mode — province/city (VN admin-unit codes, see @/types/geo)
  // now that spot-backend ships GET /geo/vn (SPOT-76 plan mục 2.1, resolved
  // via commit 84474d2). `city` requires `province`.
  province?: string;
  city?: string;
  favorited?: boolean;
};

export const EMPTY_MATCH_FILTERS: MatchFilters = { skill: [] };
