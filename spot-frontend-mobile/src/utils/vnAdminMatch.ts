import type { VnProvince } from '@/types/geo';

// Best-effort match from Geoapify's admin names to spot-backend's
// pre-2025 GSO province/ward codes (GET /geo/vn). Used by PinDropModal to
// prefill Province/Ward after a pin drop/search — the result always lands
// in an editable dropdown (see HostMatchScreen's `locationLocked`), so a
// missing match just means the host picks by hand instead of the app
// guessing silently into a locked field.
//
// Vietnam's July 2025 administrative merger folded Bình Dương and Bà
// Rịa–Vũng Tàu into Hồ Chí Minh City and renamed/merged many wards
// nationwide. Geoapify's live geocoder reflects that *current* boundary
// set, while spot-backend's /geo/vn is frozen at the *pre-2025* GSO list —
// so for an address in a merged-in area (e.g. old Bình Dương towns like
// Thuận An/Dĩ An), there is no correct pre-2025 ward code to return at
// all. Only exact matches (after normalizing/stripping the admin-level
// prefix) are accepted here — no substring/fuzzy fallback — because a
// "closest-looking" substring match on merged/renamed names produces
// confidently wrong results (e.g. matched "Quận 8" for a Tân Bình pin)
// instead of the honest "couldn't determine, please pick manually".
const PROVINCE_PREFIXES = ['tinh', 'thanh pho'];
const CITY_PREFIXES = ['quan', 'huyen', 'thi xa', 'thanh pho', 'phuong', 'xa'];

// U+0300-U+036F is the Unicode "Combining Diacritical Marks" block — what
// String.normalize('NFD') splits a Vietnamese tone/vowel mark into, so
// stripping this range removes the tone marks and the circumflex/breve/horn
// marks on letters like a/e/o/u, leaving plain Latin letters to compare.
// Built via RegExp(string) instead of a /.../ literal so no literal
// combining-mark character ever has to live in this source file.
const COMBINING_MARKS_RE = new RegExp('[\\u0300-\\u036f]', 'g');

function normalize(input: string): string {
  return input
    .normalize('NFD')
    .replace(COMBINING_MARKS_RE, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim();
}

function stripPrefix(name: string, prefixes: string[]): string {
  const n = normalize(name);
  for (const prefix of prefixes) {
    if (n === prefix) continue;
    if (n.startsWith(`${prefix} `)) return n.slice(prefix.length).trim();
  }
  return n;
}

export type VnAdminMatch = { province?: string; city?: string };

export function matchVnAdmin(
  provinces: VnProvince[],
  place: { state?: string; county?: string; city?: string }
): VnAdminMatch {
  if (!place.state) return {};
  const target = stripPrefix(place.state, PROVINCE_PREFIXES);
  const province = provinces.find((p) => stripPrefix(p.name, PROVINCE_PREFIXES) === target);
  if (!province) return {};

  const cityName = place.county || place.city;
  if (!cityName) return { province: province.code };
  const cityTarget = stripPrefix(cityName, CITY_PREFIXES);
  const city = province.cities.find((c) => stripPrefix(c.name, CITY_PREFIXES) === cityTarget);
  return { province: province.code, city: city?.code };
}
