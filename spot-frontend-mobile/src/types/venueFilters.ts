// Booking FiltersSheet output (Figma node 72:239) — maps onto venueService's
// listVenues query params. Mirrors MatchFilters' Location/Distance split.
export type VenueFilters = {
  date?: string; // YYYY-MM-DD
  timeFrom?: string; // HH:mm
  timeTo?: string; // HH:mm
  priceMin?: number; // VND
  priceMax?: number; // VND
  // Location mode — VN admin-unit codes (see @/types/geo). `city` requires `province`.
  province?: string;
  city?: string;
  // Distance mode — mutually exclusive with province/city at the API level.
  latitude?: number;
  longitude?: number;
  radiusKm?: number; // 1-20
};

export const EMPTY_VENUE_FILTERS: VenueFilters = {};
