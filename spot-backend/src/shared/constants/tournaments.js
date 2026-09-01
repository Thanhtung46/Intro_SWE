import { SPORTS } from './sports.js';

export const HOSTED_BY_LABEL = 'SPOT';

export const TOURNAMENT_CREATE_ELIGIBILITY = Object.freeze({
  MIN_COMPLETED_HOSTED: 80,
  MIN_AVG_HOST_RATING: 4.5,
});

export const TOURNAMENT_STATUSES = Object.freeze({
  OPEN_REGISTRATION: 'OPEN_REGISTRATION',
  FULL: 'FULL',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
});

export const TOURNAMENT_STATUS_CODES = Object.freeze(
  Object.values(TOURNAMENT_STATUSES),
);

/** Public browse — open slots only (FULL hidden like kèo). */
export const LISTABLE_TOURNAMENT_STATUSES = Object.freeze([
  TOURNAMENT_STATUSES.OPEN_REGISTRATION,
]);

export const FOOTBALL_TOURNAMENT_FORMATS = Object.freeze([
  'FIVE_A_SIDE',
  'SEVEN_A_SIDE',
  'ELEVEN_A_SIDE',
]);

export const BADMINTON_TOURNAMENT_FORMATS = Object.freeze([
  'MS',
  'WS',
  'MD',
  'WD',
  'MIXED',
]);

export const TOURNAMENT_FORMATS_BY_SPORT = Object.freeze({
  [SPORTS.FOOTBALL]: FOOTBALL_TOURNAMENT_FORMATS,
  [SPORTS.BADMINTON]: BADMINTON_TOURNAMENT_FORMATS,
});

export const GENDER_DIVISIONS = Object.freeze({
  MEN: 'MEN',
  WOMEN: 'WOMEN',
});

export const GENDER_DIVISION_CODES = Object.freeze(Object.values(GENDER_DIVISIONS));

export const TOURNAMENT_JOIN_REQUEST_STATUSES = Object.freeze({
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  KICKED: 'KICKED',
});

export const TOURNAMENT_JOIN_REQUEST_STATUS_CODES = Object.freeze(
  Object.values(TOURNAMENT_JOIN_REQUEST_STATUSES),
);

export const TOURNAMENT_SEARCH = Object.freeze({
  FUZZY_MIN_CHARS: 3,
  LIST_SIMILARITY: 0.28,
  SUGGEST_SIMILARITY: 0.2,
  SUGGEST_LIMIT: 5,
});

export const TOURNAMENT_MINE_TABS = Object.freeze({
  HOSTED: 'hosted',
  JOINED: 'joined',
});

export const TOURNAMENT_MINE_TAB_CODES = Object.freeze(
  Object.values(TOURNAMENT_MINE_TABS),
);

export const TOURNAMENT_MINE_SECTIONS = Object.freeze({
  TOURNAMENTS: 'tournaments',
  PENDING_REQUESTS: 'pending-requests',
  JOIN_REQUESTS: 'join-requests',
});

export const TOURNAMENT_MINE_SECTION_CODES = Object.freeze(
  Object.values(TOURNAMENT_MINE_SECTIONS),
);

export const FOOTBALL_SQUAD_BASE = Object.freeze({
  FIVE_A_SIDE: 5,
  SEVEN_A_SIDE: 7,
  ELEVEN_A_SIDE: 11,
});

export const FOOTBALL_SQUAD_EXTRA = 5;

export const BADMINTON_ROSTER_SIZE = Object.freeze({
  MS: 1,
  WS: 1,
  MD: 2,
  WD: 2,
  MIXED: 2,
});

export const TOURNAMENT_ROUNDS = Object.freeze({
  GROUP_STAGE: 'GROUP_STAGE',
  ROUND_OF_32: 'ROUND_OF_32',
  ROUND_OF_16: 'ROUND_OF_16',
  QUARTER_FINAL: 'QUARTER_FINAL',
  SEMI_FINAL: 'SEMI_FINAL',
  THIRD_PLACE: 'THIRD_PLACE',
  FINAL: 'FINAL',
});

export const TOURNAMENT_ROUND_CODES = Object.freeze(Object.values(TOURNAMENT_ROUNDS));

export const BADMINTON_SET_POINTS_TARGET = 15;

export const TOURNAMENT_MATCH_OUTCOMES = Object.freeze({
  SCHEDULED: 'SCHEDULED',
  COMPLETED: 'COMPLETED',
});

export function formatsForSport(sport) {
  return TOURNAMENT_FORMATS_BY_SPORT[sport] ?? [];
}

export function isFormatForSport(sport, format) {
  return formatsForSport(sport).includes(format);
}

export function maxFootballSquadSize(format) {
  const base = FOOTBALL_SQUAD_BASE[format];
  if (!base) {
    return null;
  }
  return base + FOOTBALL_SQUAD_EXTRA;
}

export function requiredBadmintonRosterSize(format) {
  return BADMINTON_ROSTER_SIZE[format] ?? null;
}

export function formatBadgeLabel(format, genderDivision) {
  if (format === 'FIVE_A_SIDE') {
    return genderDivision === GENDER_DIVISIONS.WOMEN ? "5v5 Women's" : '5v5';
  }
  if (format === 'SEVEN_A_SIDE') {
    return genderDivision === GENDER_DIVISIONS.WOMEN ? "7v7 Women's" : '7v7';
  }
  if (format === 'ELEVEN_A_SIDE') {
    return genderDivision === GENDER_DIVISIONS.WOMEN ? "11v11 Women's" : '11v11';
  }
  const badmintonLabels = {
    MS: "Men's Singles",
    WS: "Women's Singles",
    MD: "Men's Doubles",
    WD: "Women's Doubles",
    MIXED: 'Mixed Doubles',
  };
  return badmintonLabels[format] ?? format;
}

export function isRegistrationOpen(status) {
  return status === TOURNAMENT_STATUSES.OPEN_REGISTRATION;
}

export function canOrganizerCancel(status) {
  return (
    status === TOURNAMENT_STATUSES.OPEN_REGISTRATION ||
    status === TOURNAMENT_STATUSES.FULL
  );
}

/** PATCH fields locked once tournament reaches ACTIVE. */
export const TOURNAMENT_ACTIVE_LOCKED_PATCH_FIELDS = Object.freeze([
  'venueName',
  'venueAddress',
  'province',
  'city',
  'latitude',
  'longitude',
  'startsAt',
  'endsAt',
  'registrationDeadline',
]);

export function isTournamentPatchLockedStatus(status) {
  return (
    status === TOURNAMENT_STATUSES.ACTIVE ||
    status === TOURNAMENT_STATUSES.COMPLETED
  );
}

export function findActiveLockedPatchFields(input) {
  return TOURNAMENT_ACTIVE_LOCKED_PATCH_FIELDS.filter(
    (field) => input[field] !== undefined,
  );
}
