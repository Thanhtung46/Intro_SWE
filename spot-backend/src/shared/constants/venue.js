export const SPORT_TYPES = Object.freeze({
  FOOTBALL: 'Football',
  BADMINTON: 'Badminton',
});

/** Court size for football fields only — "sân 5" vs "sân 7". Null for badminton. */
export const FOOTBALL_VARIANTS = Object.freeze({
  FIVE_A_SIDE: 'FIVE_A_SIDE',
  SEVEN_A_SIDE: 'SEVEN_A_SIDE',
});

const NORMALIZED_BY_LOWERCASE = Object.freeze({
  football: SPORT_TYPES.FOOTBALL,
  badminton: SPORT_TYPES.BADMINTON,
});

/** Case-insensitive match against SPORT_TYPES; null if unsupported. */
export function normalizeSportType(input) {
  if (typeof input !== 'string') return null;
  return NORMALIZED_BY_LOWERCASE[input.toLowerCase()] ?? null;
}
