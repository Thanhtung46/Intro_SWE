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
// all. Only *exact* matches are accepted — after normalizing (diacritics
// off, lowercase), stripping the admin-level word off either end, and
// consulting a hardcoded alias table for a handful of big cities. No
// substring/fuzzy fallback — a "closest-looking" substring match on
// merged/renamed names produces confidently wrong results (e.g. matched
// "Quận 8" for a Tân Bình pin) instead of the honest "couldn't determine,
// please pick manually".
//
// Geoapify returns admin names in a mix of Vietnamese and English ("Ho Chi
// Minh City", "District 7", "Thu Duc City"), sometimes with the admin word
// trailing rather than leading — so strip these tokens from *both* ends
// after normalizing, not just the front.
const PROVINCE_AFFIXES = ['tinh', 'thanh pho', 'province', 'city'];
const CITY_AFFIXES = ['quan', 'huyen', 'thi xa', 'thanh pho', 'phuong', 'xa', 'district', 'ward', 'city'];

// Big cities Geoapify names in English / without spaces / differently
// enough that affix-stripping alone won't line them up with the pre-2025
// GSO Vietnamese names. Keys are already normalize()'d + affix-stripped.
// Codes verified against spot-backend/src/shared/constants/vn-admin.json.
const PROVINCE_ALIASES: Record<string, string> = {
  'ho chi minh': '79',
  hanoi: '01',
  'ha noi': '01',
  'da nang': '48',
  danang: '48',
  'hai phong': '31',
  haiphong: '31',
  'can tho': '92',
  cantho: '92',
  hue: '46',
};

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

// Strip a known admin-level word off either end of the normalized name, once
// per end (e.g. "thanh pho thu duc" -> "thu duc", "thu duc city" -> "thu duc").
function stripAffix(name: string, affixes: string[]): string {
  let n = normalize(name);
  for (const affix of affixes) {
    if (n === affix) continue;
    if (n.startsWith(`${affix} `)) { n = n.slice(affix.length).trim(); break; }
  }
  for (const affix of affixes) {
    if (n === affix) continue;
    if (n.endsWith(` ${affix}`)) { n = n.slice(0, -affix.length).trim(); break; }
  }
  return n;
}

export type VnAdminMatch = { province?: string; city?: string };

export function matchVnAdmin(
  provinces: VnProvince[],
  place: { state?: string; county?: string; city?: string }
): VnAdminMatch {
  if (!place.state) return {};
  const target = stripAffix(place.state, PROVINCE_AFFIXES);
  const province =
    provinces.find((p) => p.code === PROVINCE_ALIASES[target]) ??
    provinces.find((p) => stripAffix(p.name, PROVINCE_AFFIXES) === target);
  if (!province) return {};

  const cityName = place.county || place.city;
  if (!cityName) return { province: province.code };
  const cityTarget = stripAffix(cityName, CITY_AFFIXES);
  const city = province.cities.find((c) => stripAffix(c.name, CITY_AFFIXES) === cityTarget);
  return { province: province.code, city: city?.code };
}
