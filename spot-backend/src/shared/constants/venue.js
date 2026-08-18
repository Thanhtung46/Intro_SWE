export const SPORT_TYPES = Object.freeze({
  FOOTBALL: 'Football',
  BADMINTON: 'Badminton',
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
