import { SPORTS } from './sports.js';

export const MATCH_FORMATS_BY_SPORT = Object.freeze({
  [SPORTS.BADMINTON]: Object.freeze(['SINGLES', 'DOUBLES']),
  [SPORTS.FOOTBALL]: Object.freeze([
    'FIVE_A_SIDE',
    'SEVEN_A_SIDE',
    'ELEVEN_A_SIDE',
  ]),
});

export const MATCH_FORMATS = Object.freeze(
  Object.values(MATCH_FORMATS_BY_SPORT).flat(),
);

export const FEE_TYPES = Object.freeze({
  GENDER_RANGE: 'GENDER_RANGE',
  SPLIT_EVENLY: 'SPLIT_EVENLY',
});

export const FEE_TYPE_CODES = Object.freeze(Object.values(FEE_TYPES));

export const JOIN_MODES = Object.freeze({
  AUTO: 'AUTO',
  APPROVAL: 'APPROVAL',
});

export const JOIN_MODE_CODES = Object.freeze(Object.values(JOIN_MODES));

export const JOIN_REQUEST_STATUSES = Object.freeze({
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  KICKED: 'KICKED',
});

export const JOIN_REQUEST_STATUS_CODES = Object.freeze(
  Object.values(JOIN_REQUEST_STATUSES),
);

export const PAYMENT_STATUSES = Object.freeze({
  SUCCESS: 'SUCCESS',
});

/** Guest / fee gender for GENDER_RANGE (matchmaking only). */
export const FEE_GENDERS = Object.freeze(['female', 'male']);

export const MATCH_STATUSES = Object.freeze({
  OPEN: 'OPEN',
  FULL: 'FULL',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
});

export const MATCH_STATUS_CODES = Object.freeze(Object.values(MATCH_STATUSES));

/** GET /matches public browse — OPEN kèo còn slot (FULL hidden from homepage list). */
export const LISTABLE_MATCH_STATUSES = Object.freeze([MATCH_STATUSES.OPEN]);

/** Pitch still occupied while OPEN or FULL (overlap / 409 checks). */
export const PITCH_OCCUPIED_STATUSES = Object.freeze([
  MATCH_STATUSES.OPEN,
  MATCH_STATUSES.FULL,
]);

/** GET /matches?location= — unaccent + trigram; suggestions from title/venue/address. */
export const MATCH_SEARCH = Object.freeze({
  FUZZY_MIN_CHARS: 3,
  LIST_SIMILARITY: 0.28,
  SUGGEST_SIMILARITY: 0.2,
  SUGGEST_LIMIT: 5,
  /** Host form venue picker — wider pool than homepage browse. */
  VENUE_SUGGEST_LIMIT: 10,
  VENUE_SUGGEST_SIMILARITY: 0.2,
});

/** Host bulk publish (Vmito-style clone / weekly expand on FE). */
export const BULK_CREATE = Object.freeze({
  MAX_SCHEDULES: 100,
});

export const MINE_TABS = Object.freeze({
  ACTIVE: 'active',
  COMPLETED: 'completed',
});

export const MINE_TAB_CODES = Object.freeze(Object.values(MINE_TABS));

/** Manage Matches list — caller relationship to the kèo. */
export const MY_MATCH_ROLES = Object.freeze({
  HOST: 'HOST',
  PARTICIPANT: 'PARTICIPANT',
});

export const MY_MATCH_ROLE_CODES = Object.freeze(Object.values(MY_MATCH_ROLES));

/** Host listing duration: at least 1 hour, no maximum. */
export const MATCH_MIN_DURATION_MINUTES = 60;

/** Pitch identity: venue name + address + court, case/space-insensitive. Shared by all hosts. */
export function normalizeVenueName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function normalizeVenueAddress(address) {
  return normalizeVenueName(address);
}

export function normalizeCourtName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function pitchKey(venueName, venueAddress, courtName) {
  return `${normalizeVenueName(venueName)}::${normalizeVenueAddress(venueAddress)}::${normalizeCourtName(courtName)}`;
}

/** Half-open: 09:00–11:00 does not overlap 11:00–13:00. */
export function timesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

export function formatsForSport(sport) {
  return MATCH_FORMATS_BY_SPORT[sport] ?? [];
}

export function isFormatForSport(sport, format) {
  return formatsForSport(sport).includes(format);
}

export function computeYourShare({
  feeType,
  priceMin,
  priceMax,
  filledCount,
  gender,
}) {
  if (feeType === FEE_TYPES.SPLIT_EVENLY) {
    const heads = Math.max(Number(filledCount) || 0, 1);
    const total = Number(priceMin);
    if (!Number.isFinite(total) || total < 1) {
      return null;
    }
    return Math.ceil(total / heads);
  }
  if (feeType !== FEE_TYPES.GENDER_RANGE) {
    return null;
  }
  if (gender === 'female') {
    return priceMin;
  }
  if (gender === 'male') {
    return priceMax;
  }
  return null;
}

export function computeRequestShare({
  feeType,
  priceMin,
  priceMax,
  filledCount,
  joinerGender,
  guests = [],
}) {
  const self = computeYourShare({
    feeType,
    priceMin,
    priceMax,
    filledCount,
    gender: joinerGender,
  });
  const guestShares = guests.map((guest) =>
    computeYourShare({
      feeType,
      priceMin,
      priceMax,
      filledCount,
      gender: guest.gender,
    }),
  );
  const amounts = [self, ...guestShares];
  if (amounts.some((amount) => amount == null)) {
    return null;
  }
  return amounts.reduce((sum, amount) => sum + amount, 0);
}
