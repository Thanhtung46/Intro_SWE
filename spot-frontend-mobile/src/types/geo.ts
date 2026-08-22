// GET /geo/vn (+ /api/geo/vn) — Vietnam admin-unit tree, pre-2025 codes.
// Backs FilterSheet's Province/City dropdowns (SPOT-76 plan mục 2.1).
// Mirrors spot-backend/src/shared/constants/vn-admin.js's getVnAdminTree()
// shape (full dataset: 63 provinces / 705 cities, spot-backend/src/shared/
// constants/vn-admin.json — not duplicated here, fetched via matchService).
export type VnCity = {
  code: string;
  name: string;
};

export type VnProvince = {
  code: string;
  name: string;
  cities: VnCity[];
};

export type VnAdminTree = {
  provinces: VnProvince[];
};
