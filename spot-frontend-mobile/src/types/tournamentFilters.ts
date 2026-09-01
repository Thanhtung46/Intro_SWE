// Tournament browse filter-sheet output (Pencil "Tournament - Filter Sheet"
// frame). Maps 1:1 onto tournamentService's ListTournamentsQuery except `sport`
// (owned by the Homepage screen's own toggle). Mirrors GroupFilters but WITHOUT
// `skill` — tournaments have no skill gate (TOURNAMENT_PLAN.md). Distance mode
// (latitude/longitude/radiusKm) is XOR with the free-text search bar and with
// province/city at the API level — send only one set (see list-tournaments.dto.js).
export type TournamentFilters = {
  province?: string; // VN admin-unit code (pre-2025); `city` requires this
  city?: string;
  favorited?: boolean;
  latitude?: number;
  longitude?: number;
  radiusKm?: number; // 1-20
};

export const EMPTY_TOURNAMENT_FILTERS: TournamentFilters = {};
