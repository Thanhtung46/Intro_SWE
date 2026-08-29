// Filter sheet output (Pencil "Group - Filter" frame) — maps 1:1 onto
// groupService's ListGroupsQuery fields except sport (owned by the
// Homepage screen's own toggle, not part of this sheet). Unlike
// MatchFilters, this DOES include latitude/longitude/radiusKm — the Groups
// filter sheet has an explicit Location-vs-Distance radio + a 1-20km
// slider (confirmed against the Pencil mockup), so the Distance mode is
// part of this feature's scope from the start.
export type GroupFilters = {
  skill: string[];
  province?: string; // VN admin-unit code (pre-2025), see @/types/geo — requires no dependency, but `city` requires this
  city?: string; // requires province
  favorited?: boolean;
  // Distance mode — mutually exclusive with `location` (the free-text
  // search bar) at the API level; all three must be set together.
  latitude?: number;
  longitude?: number;
  radiusKm?: number; // 1-20
};

export const EMPTY_GROUP_FILTERS: GroupFilters = { skill: [] };
