// Referee Job Board filter sheet output (Pencil "Book field - Filter 3"
// frame, reused for the referee board). Sport is owned by the board
// screen's own pill row, not this sheet. Location and Distance are
// mutually exclusive at the API level (GET /referee/board 400s if both are
// sent) — the sheet has a Location/Distance radio, so `mode` picks which
// set of fields the service forwards.
export type RefereeBoardFilters = {
  mode: 'location' | 'distance';
  // Location mode
  province?: string; // VN admin-unit code (pre-2025), see @/types/geo
  city?: string; // requires province
  favoritedOnly?: boolean;
  // Distance mode — all three sent together
  lat?: number;
  lng?: number;
  radiusKm: number; // 1-20, slider default 20
};

export const EMPTY_REFEREE_BOARD_FILTERS: RefereeBoardFilters = {
  mode: 'location',
  radiusKm: 20,
};
