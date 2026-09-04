import { readFileSync } from 'fs';
import { BADMINTON_SKILLS } from '../../src/shared/constants/sports.js';
import { VN_PHONE_REGEX } from '../../src/shared/constants/auth.js';
import vnAdmin from '../../src/shared/constants/vn-admin.json' with { type: 'json' };
import { filterItemsByVenueTime } from './vmito-venue-dedupe.js';

const VMITO_API_ORIGIN = (process.env.VMITO_API_BASE ?? 'https://vmito.com').replace(
  /\/$/,
  '',
);

/** SPOT import scope: TP.HCM + Hà Nội only (pre-2025 GSO codes). */
export const HCM_PROVINCE_CODE = '79';
export const HANOI_PROVINCE_CODE = '01';
export const SUPPORTED_PROVINCE_CODES = [HCM_PROVINCE_CODE, HANOI_PROVINCE_CODE];

/** Vmito session statuses worth importing — browse/join only (skip FINISHED/CANCELLED). */
export const VMITO_BROWSE_STATUSES = ['PREPARING', 'IN_PROGRESS'];

export function isVmitoSessionBrowsable(session) {
  return VMITO_BROWSE_STATUSES.includes(session?.status);
}

/** Internal tag appended to imported kèo notes (sync idempotency + reset:vmito). Not shown as public source URL. */
export const VMITO_IMPORT_TAG_PREFIX = '[vmito-import:';
export const VMITO_LEGACY_SOURCE_NOTES = '%vmito.com/vi/sessions/%';
export const VMITO_IMPORT_NOTES = '%[vmito-import:%';

export function vmitoImportTag(slug) {
  return `${VMITO_IMPORT_TAG_PREFIX}${slug}]`;
}

export function vmitoImportMatchSql(column = 'notes') {
  return `(${column} ILIKE '${VMITO_IMPORT_NOTES}' OR ${column} ILIKE '${VMITO_LEGACY_SOURCE_NOTES}')`;
}

const PROVINCE_FALLBACK_CITY = {
  [HCM_PROVINCE_CODE]: '778',
  [HANOI_PROVINCE_CODE]: '001',
};

const HCM_DISTRICT_ALIASES = new Map([
  ['quan 9', 'thanh pho thu duc'],
  ['q.9', 'thanh pho thu duc'],
  ['q9', 'thanh pho thu duc'],
  ['thu duc', 'thanh pho thu duc'],
  ['tp thu duc', 'thanh pho thu duc'],
  ['go vap', 'quan go vap'],
  ['binh thanh', 'quan binh thanh'],
]);

const HANOI_DISTRICT_ALIASES = new Map([
  ['ba dinh', 'quan ba dinh'],
  ['hoan kiem', 'quan hoan kiem'],
  ['tay ho', 'quan tay ho'],
  ['long bien', 'quan long bien'],
  ['cau giay', 'quan cau giay'],
  ['dong da', 'quan dong da'],
  ['hai ba trung', 'quan hai ba trung'],
  ['hoang mai', 'quan hoang mai'],
  ['thanh xuan', 'quan thanh xuan'],
  ['nam tu liem', 'quan nam tu liem'],
  ['bac tu liem', 'quan bac tu liem'],
  ['ha dong', 'quan ha dong'],
]);

/** Extract a JSON array embedded in Vmito Next.js RSC HTML (`key":[...]`). */
export function extractRscJsonArray(html, key) {
  const markers = [`${key}\\":[`, `${key}":[`];
  let start = -1;
  for (const marker of markers) {
    const idx = html.indexOf(marker);
    if (idx >= 0) {
      start = idx + marker.length - 1;
      break;
    }
  }
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < html.length; i += 1) {
    const ch = html[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '[') depth += 1;
    if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        const raw = html.slice(start, i + 1);
        return JSON.parse(raw.replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
      }
    }
  }
  return null;
}

export function skillCodeForVmitoRank(rank) {
  return BADMINTON_SKILLS.find((item) => item.rank === rank)?.code ?? null;
}

function normalizeDistrictName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function districtAliasesForProvince(provinceCode) {
  if (provinceCode === HCM_PROVINCE_CODE) return HCM_DISTRICT_ALIASES;
  if (provinceCode === HANOI_PROVINCE_CODE) return HANOI_DISTRICT_ALIASES;
  return null;
}

export function resolveAdminCityCode(provinceCode, districtName) {
  if (!districtName || !provinceCode) return null;
  const raw = normalizeDistrictName(districtName);
  const aliases = districtAliasesForProvince(provinceCode);
  let target = aliases?.get(raw) ?? raw;
  if (aliases?.has(target)) {
    target = aliases.get(target);
  } else {
    target = target
      .replace(/^quan\s+/, '')
      .replace(/^phuong\s+/, '')
      .replace(/^huyen\s+/, '')
      .replace(/^thi xa\s+/, '')
      .trim();
  }
  const province = vnAdmin.provinces.find((p) => p.code === provinceCode);
  if (!province) return null;
  const city = province.cities.find((row) => {
    const name = normalizeDistrictName(row.name);
    return name === target || name.includes(target) || target.includes(name);
  });
  return city?.code ?? null;
}

/** @deprecated Use resolveAdminCityCode(HCM_PROVINCE_CODE, districtName). */
export function resolveHcmCityCode(districtName) {
  return resolveAdminCityCode(HCM_PROVINCE_CODE, districtName);
}

function locationTextBlob(session) {
  const venue = session.venue ?? {};
  return [
    venue.city,
    venue.newCity,
    session.customLocationCity,
    venue.district,
    venue.newDistrict,
    session.customLocationDistrict,
    venue.address,
    venue.newAddress,
    venue.streetAddress,
    session.customLocationAddress,
    session.location,
    session.name,
    session.description,
    session.externalSource,
    session.searchTerms,
  ]
    .filter(Boolean)
    .map((value) => normalizeDistrictName(value))
    .join(' ');
}

function provinceFromCoords(lat, lng) {
  if (lat == null || lng == null) return null;
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
  if (
    latitude >= 10.35 &&
    latitude <= 11.05 &&
    longitude >= 106.35 &&
    longitude <= 107.05
  ) {
    return HCM_PROVINCE_CODE;
  }
  if (
    latitude >= 20.95 &&
    latitude <= 21.15 &&
    longitude >= 105.75 &&
    longitude <= 106.05
  ) {
    return HANOI_PROVINCE_CODE;
  }
  return null;
}

export function resolveProvinceFromSession(session) {
  const venue = session.venue ?? {};
  const text = locationTextBlob(session);

  const mentionsHanoi =
    /\b(ha noi|hanoi|thanh pho ha noi)\b/.test(text) &&
    !/\b(ho chi minh|tp ho chi minh)\b/.test(text);
  const mentionsHcm = /\b(ho chi minh|tp ho chi minh|tp hcm|hcm)\b/.test(text);

  if (mentionsHanoi) {
    return { provinceCode: HANOI_PROVINCE_CODE, provinceResolved: true };
  }
  if (mentionsHcm) {
    return { provinceCode: HCM_PROVINCE_CODE, provinceResolved: true };
  }

  const lat = venue.lat ?? session.customLocationLat;
  const lng = venue.lng ?? session.customLocationLng;
  const fromCoords = provinceFromCoords(lat, lng);
  if (fromCoords) {
    return { provinceCode: fromCoords, provinceResolved: true, via: 'coords' };
  }

  return { provinceCode: null, provinceResolved: false };
}

export function isSupportedVmitoProvince(provinceCode) {
  return SUPPORTED_PROVINCE_CODES.includes(provinceCode);
}

function vndAmount(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const n = Number(value);
  if (n <= 0) return null;
  return n < 1000 ? n * 1000 : n;
}

function resolveDateRange(session) {
  const startRaw = session.scheduledStartTime ?? session.startTime;
  let start = startRaw ? new Date(startRaw) : null;
  let end = session.scheduledEndTime ?? session.endTime;
  end = end ? new Date(end) : null;

  if (!start || Number.isNaN(start.getTime())) {
    start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    start.setHours(18, 0, 0, 0);
  }
  if (!end || Number.isNaN(end.getTime()) || end <= start) {
    end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  }
  return { startsAt: start.toISOString(), endsAt: end.toISOString() };
}

function resolveVenue(session) {
  const venue = session.venue ?? {};
  const venueName =
    venue.name ??
    session.customLocationName ??
    session.location ??
    'Sân cầu lông';
  const venueAddress =
    venue.address ??
    venue.streetAddress ??
    session.customLocationAddress ??
    session.location ??
    venueName;
  const latitude = venue.lat ?? session.customLocationLat ?? null;
  const longitude = venue.lng ?? session.customLocationLng ?? null;
  const district =
    venue.district ??
    venue.newDistrict ??
    session.customLocationDistrict ??
    extractDistrictFromText(session.name) ??
    extractDistrictFromText(venueAddress);
  const provinceInfo = resolveProvinceFromSession(session);
  const provinceCode = provinceInfo.provinceCode;
  const cityCode = provinceCode
    ? resolveAdminCityCode(provinceCode, district)
    : null;
  const fallbackCity = provinceCode
    ? PROVINCE_FALLBACK_CITY[provinceCode]
    : null;
  return {
    venueName,
    venueAddress,
    province: provinceCode,
    city: cityCode ?? fallbackCity,
    cityResolved: Boolean(cityCode),
    provinceResolved: provinceInfo.provinceResolved,
    supportedProvince: isSupportedVmitoProvince(provinceCode),
    district,
    latitude,
    longitude,
  };
}

function extractDistrictFromText(text) {
  const match = String(text).match(
    /(?:Quận|Q\.)\s*[\d\wÀ-ỹ]+|Thủ Đức|Gò Vấp|Bình Thạnh|Tân Bình|Ba Đình|Hoàn Kiếm|Cầu Giấy|Đống Đa|Hoàng Mai|Thanh Xuân|Long Biên|Tây Hồ|Hai Bà Trưng|Hà Đông|Bắc Từ Liêm|Nam Từ Liêm/i,
  );
  return match?.[0] ?? null;
}

function resolveSkills(requiredLevels) {
  if (!requiredLevels?.length) {
    return { allLevels: true, skillMin: undefined, skillMax: undefined };
  }
  const codes = requiredLevels
    .map((rank) => skillCodeForVmitoRank(rank))
    .filter(Boolean);
  if (!codes.length) {
    return { allLevels: true, skillMin: undefined, skillMax: undefined };
  }
  const ranks = requiredLevels
    .map((rank) => BADMINTON_SKILLS.find((item) => item.rank === rank))
    .filter(Boolean)
    .sort((a, b) => a.rank - b.rank);
  return {
    allLevels: false,
    skillMin: ranks[0]?.code,
    skillMax: ranks[ranks.length - 1]?.code,
  };
}

function resolveFee(feeConfig) {
  if (!feeConfig) {
    return {
      feeType: 'SPLIT_EVENLY',
      priceMin: 100000,
      priceMax: undefined,
    };
  }
  if (feeConfig.feeType === 'SPLIT' || feeConfig.splitTotal != null) {
    const total = vndAmount(feeConfig.splitTotal ?? feeConfig.splitPerPlayer);
    return {
      feeType: 'SPLIT_EVENLY',
      priceMin: total ?? 100000,
      priceMax: undefined,
    };
  }
  const female = vndAmount(feeConfig.femaleFee);
  const male = vndAmount(feeConfig.maleFee);
  if (female != null || male != null) {
    return {
      feeType: 'GENDER_RANGE',
      priceMin: female ?? male ?? 50000,
      priceMax: male ?? female ?? 100000,
    };
  }
  return {
    feeType: 'SPLIT_EVENLY',
    priceMin: 100000,
    priceMax: undefined,
  };
}

function buildCourts(session) {
  if (session.courts?.length) {
    return session.courts.map((court, index) => ({
      name: court.courtName?.trim() || `Sân ${court.courtNumber ?? index + 1}`,
    }));
  }
  const count = Math.max(1, Number(session.numberOfCourts) || 1);
  return Array.from({ length: count }, (_, index) => ({
    name: `Sân ${index + 1}`,
  }));
}

function isHttpUrl(value) {
  if (typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

/** First usable cover URL from Vmito — venue/session photos only (never host avatar). */
export function resolveVmitoCoverUrl(session) {
  const candidates = [
    session?.coverPhoto,
    session?.venue?.coverPhoto,
    ...(Array.isArray(session?.images) ? session.images : []),
    ...(Array.isArray(session?.venue?.images) ? session.venue.images : []),
  ];
  for (const candidate of candidates) {
    if (isHttpUrl(candidate)) {
      return candidate.trim();
    }
  }
  return null;
}

export function mapVmitoSessionToSpotDraft(session) {
  const venue = resolveVenue(session);
  const { startsAt, endsAt } = resolveDateRange(session);
  const skills = resolveSkills(session.requiredLevels);
  const fee = resolveFee(session.feeConfig);
  const courts = buildCourts(session);
  const maxPlayers = Math.min(
    40,
    Math.max(
      2,
      (Number(session.numberOfCourts) || 1) *
        (Number(session.maxPlayersPerCourt) || 8),
    ),
  );
  const notesParts = [
    session.description?.trim(),
    session.notes?.trim(),
    session.hostPhone ? `Liên hệ host: ${session.hostPhone}` : null,
    session.shuttlecock ? `Cầu: ${session.shuttlecock}` : null,
    session.feeConfig?.notes,
  ].filter(Boolean);

  const importTag = vmitoImportTag(session.slug);
  const tagReserve = importTag.length + (notesParts.length ? 2 : 0);
  const userNotes = notesParts.join('\n\n').slice(0, Math.max(0, 2000 - tagReserve));
  const notes = userNotes ? `${userNotes}\n\n${importTag}` : importTag;

  const body = {
    sport: session.sportType === 'FOOTBALL' ? 'FOOTBALL' : 'BADMINTON',
    format:
      session.defaultMatchType === 'SINGLES' ? 'SINGLES' : 'DOUBLES',
    title: (session.name || 'Kèo cầu lông').slice(0, 150),
    notes,
    venueName: venue.venueName.slice(0, 255),
    venueAddress: venue.venueAddress.slice(0, 500),
    province: venue.province,
    city: venue.city,
    startsAt,
    endsAt,
    maxPlayers,
    joinMode: 'APPROVAL',
    feeType: fee.feeType,
    priceMin: fee.priceMin,
    courts,
    ...skills,
  };

  if (fee.feeType === 'GENDER_RANGE' && fee.priceMax != null) {
    body.priceMax = fee.priceMax;
  }
  if (venue.latitude != null && venue.longitude != null) {
    body.latitude = venue.latitude;
    body.longitude = venue.longitude;
  }
  const coverUrl = resolveVmitoCoverUrl(session);
  if (coverUrl) {
    body.coverUrl = coverUrl;
  }

  return {
    vmitoId: session.id,
    hostId: session.hostId,
    slug: session.slug,
    status: session.status,
    hostName: session.hostName,
    hostPhone: session.hostPhone,
    isCrawled: session.isCrawled,
    externalSource: session.externalSource,
    playerCount: session._count?.players ?? 0,
    venueDistrict: venue.district,
    provinceCode: venue.province,
    provinceResolved: venue.provinceResolved,
    supportedProvince: venue.supportedProvince,
    cityResolved: venue.cityResolved,
    spotCreateBody: body,
  };
}

export function normalizeVnPhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return VN_PHONE_REGEX.test(digits) ? digits : null;
}

/** Non-null finite lat/lng required for map pins in the mobile app. */
export function hasValidMapCoords(body) {
  const lat = body?.latitude;
  const lng = body?.longitude;
  if (lat == null || lng == null) return false;
  const latitude = Number(lat);
  const longitude = Number(lng);
  return (
    Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude !== 0
    && longitude !== 0
  );
}

/** Preferred for SPOT sync (has host phone + mappable create body + map location). */
export function assessVmitoSyncEligibility(session, draft) {
  const reasons = [];
  if (!isVmitoSessionBrowsable(session)) {
    reasons.push(`inactive status (${session?.status ?? 'unknown'})`);
  }
  if (!draft?.supportedProvince) {
    reasons.push('unsupported province (HCM/Hanoi only)');
  }
  if (!normalizeVnPhone(session.hostPhone)) {
    reasons.push('missing hostPhone');
  }
  const body = draft?.spotCreateBody;
  if (!body?.title?.trim()) reasons.push('missing title');
  if (!body?.venueName?.trim()) reasons.push('missing venueName');
  if (!body?.venueAddress?.trim()) reasons.push('missing venueAddress');
  if (!body?.province) reasons.push('missing province');
  if (!body?.city) reasons.push('missing city');
  if (!hasValidMapCoords(body)) reasons.push('missing map coordinates');
  if (!body?.startsAt) reasons.push('missing startsAt');
  if (!body?.courts?.length) reasons.push('missing courts');
  return { eligible: reasons.length === 0, reasons };
}

export async function fetchVmitoPublicPage({
  page = 1,
  limit = 50,
  fetchImpl = fetch,
} = {}) {
  const url = `${VMITO_API_ORIGIN}/api/sessions/public?page=${page}&limit=${limit}`;
  const res = await fetchImpl(url, {
    headers: {
      'User-Agent': 'SPOT-dev-fetch/1.0 (+local seed script)',
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`Vmito public API failed: HTTP ${res.status}`);
  }
  const json = await res.json();
  const payload = json.data ?? json;
  return {
    sessions: payload.data ?? [],
    page: payload.page ?? page,
    limit: payload.limit ?? limit,
    total: payload.total ?? null,
    totalPages: payload.totalPages ?? null,
  };
}

async function collectVmitoSessions(targetLimit, fetchImpl) {
  const preferred = [];
  const fallback = [];
  const seen = new Set();
  let page = 1;
  let totalAvailable = null;
  let totalPages = null;
  let unsupportedSkipped = 0;
  let inactiveStatusSkipped = 0;
  const pageSize = Math.min(100, Math.max(targetLimit, 50));

  while (preferred.length < targetLimit) {
    const batch = await fetchVmitoPublicPage({ page, limit: pageSize, fetchImpl });
    totalAvailable = batch.total ?? totalAvailable;
    totalPages = batch.totalPages ?? totalPages;
    if (!batch.sessions.length) {
      break;
    }

    for (const session of batch.sessions) {
      if (seen.has(session.id)) {
        continue;
      }
      seen.add(session.id);
      if (!isVmitoSessionBrowsable(session)) {
        inactiveStatusSkipped += 1;
        continue;
      }
      const draft = mapVmitoSessionToSpotDraft(session);
      if (!draft.supportedProvince) {
        unsupportedSkipped += 1;
        continue;
      }
      const eligibility = assessVmitoSyncEligibility(session, draft);
      const enrichedDraft = {
        ...draft,
        syncEligible: eligibility.eligible,
        syncEligibleReasons: eligibility.reasons,
      };
      const row = { session, draft: enrichedDraft };
      if (eligibility.eligible) {
        preferred.push(row);
      } else {
        fallback.push(row);
      }
    }

    if (totalPages != null && page >= totalPages) {
      break;
    }
    if (batch.sessions.length < pageSize) {
      break;
    }
    page += 1;
    if (page > 200) {
      break;
    }
  }

  const picked = preferred.slice(0, targetLimit);
  const pickedRows = picked.map((row) => row.session);
  const pickedDrafts = picked.map((row) => row.draft);

  const { kept: dedupedDrafts, skipped: venueDupes } = filterItemsByVenueTime(
    pickedDrafts,
    (draft) => {
      const body = draft.spotCreateBody;
      if (!body?.venueName || !body.startsAt || !body.endsAt) {
        return null;
      }
      return {
        venueName: body.venueName,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
      };
    },
    { getSlug: (draft) => draft.slug },
  );
  const keptSlugSet = new Set(dedupedDrafts.map((d) => d.slug));
  const dedupedSessions = pickedRows.filter((session) => keptSlugSet.has(session.slug));

  return {
    sessions: dedupedSessions,
    spotDrafts: dedupedDrafts,
    eligibleCount: dedupedDrafts.filter((d) => d.syncEligible).length,
    ineligibleCollected: fallback.length,
    venueTimeDuplicatesSkipped: venueDupes.length,
    unsupportedSkipped,
    inactiveStatusSkipped,
    totalAvailableOnVmito: totalAvailable,
    pagesFetched: page,
  };
}

export async function fetchVmitoListings({
  baseUrl = 'https://vmito.com/vi',
  limit = 12,
  fetchImpl = fetch,
} = {}) {
  const target = Math.max(1, Number(limit) || 12);
  const collected = await collectVmitoSessions(target, fetchImpl);
  return {
    fetchedAt: new Date().toISOString(),
    sourceUrl: `${VMITO_API_ORIGIN}/api/sessions/public`,
    provinceScope: SUPPORTED_PROVINCE_CODES,
    requestedLimit: target,
    count: collected.sessions.length,
    eligibleCount: collected.eligibleCount,
    ineligibleCollected: collected.ineligibleCollected ?? 0,
    venueTimeDuplicatesSkipped: collected.venueTimeDuplicatesSkipped ?? 0,
    inactiveStatusSkipped: collected.inactiveStatusSkipped ?? 0,
    unsupportedSkipped: collected.unsupportedSkipped,
    totalAvailableOnVmito: collected.totalAvailableOnVmito,
    pagesFetched: collected.pagesFetched,
    sessions: collected.sessions,
    spotDrafts: collected.spotDrafts,
  };
}

/** @deprecated Homepage RSC scrape — capped ~12 rows; prefer fetchVmitoListings (public API). */
export async function fetchVmitoListingsFromHomepage({
  baseUrl = 'https://vmito.com/vi',
  fetchImpl = fetch,
} = {}) {
  const res = await fetchImpl(baseUrl, {
    headers: {
      'User-Agent': 'SPOT-dev-fetch/1.0 (+local seed script)',
      Accept: 'text/html',
    },
  });
  if (!res.ok) {
    throw new Error(`Vmito fetch failed: HTTP ${res.status}`);
  }
  const html = await res.text();
  const sessions = extractRscJsonArray(html, 'initialSessions') ?? [];
  return {
    fetchedAt: new Date().toISOString(),
    sourceUrl: baseUrl,
    requestedLimit: sessions.length,
    count: sessions.length,
    eligibleCount: sessions.filter((session, index) => {
      const draft = mapVmitoSessionToSpotDraft(session);
      return assessVmitoSyncEligibility(session, draft).eligible;
    }).length,
    sessions,
    spotDrafts: sessions.map(mapVmitoSessionToSpotDraft),
  };
}

export function parseVmitoHtmlFile(path) {
  const html = readFileSync(path, 'utf8');
  const sessions = extractRscJsonArray(html, 'initialSessions') ?? [];
  return {
    fetchedAt: new Date().toISOString(),
    sourceUrl: path,
    count: sessions.length,
    sessions,
    spotDrafts: sessions.map(mapVmitoSessionToSpotDraft),
  };
}
