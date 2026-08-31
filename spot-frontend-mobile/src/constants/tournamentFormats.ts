import type { Sport } from '@/types/match';
import type {
  GenderDivision,
  TournamentFormat,
  TournamentRound,
} from '@/types/tournament';

// Mirrors spot-backend/src/shared/constants/tournaments.js
// (FOOTBALL_TOURNAMENT_FORMATS / BADMINTON_TOURNAMENT_FORMATS /
// TOURNAMENT_ROUND_CODES / maxFootballSquadSize / requiredBadmintonRosterSize).
// Keep in sync if that file changes. NOTE: the badge string itself
// ("5v5 Women's" etc.) is server-computed and returned as `tournament.formatBadge`
// — render that verbatim, do NOT recompute it here.

const FORMATS_BY_SPORT: Record<Sport, { value: TournamentFormat; label: string }[]> = {
  FOOTBALL: [
    { value: 'FIVE_A_SIDE', label: '5-a-side' },
    { value: 'SEVEN_A_SIDE', label: '7-a-side' },
    { value: 'ELEVEN_A_SIDE', label: '11-a-side' },
  ],
  BADMINTON: [
    { value: 'MS', label: "Men's Singles" },
    { value: 'WS', label: "Women's Singles" },
    { value: 'MD', label: "Men's Doubles" },
    { value: 'WD', label: "Women's Doubles" },
    { value: 'MIXED', label: 'Mixed Doubles' },
  ],
};

export function formatsForSport(sport: Sport): { value: TournamentFormat; label: string }[] {
  return FORMATS_BY_SPORT[sport];
}

// genderDivision is required for football tournaments, omitted for badminton.
export const GENDER_DIVISIONS: { value: GenderDivision; label: string }[] = [
  { value: 'MEN', label: "Men's" },
  { value: 'WOMEN', label: "Women's" },
];

export function needsGenderDivision(sport: Sport): boolean {
  return sport === 'FOOTBALL';
}

export const ROUND_ORDER: TournamentRound[] = [
  'GROUP_STAGE',
  'ROUND_OF_32',
  'ROUND_OF_16',
  'QUARTER_FINAL',
  'SEMI_FINAL',
  'THIRD_PLACE',
  'FINAL',
];

export const ROUND_LABELS: Record<TournamentRound, string> = {
  GROUP_STAGE: 'Group Stage',
  ROUND_OF_32: 'Round of 32',
  ROUND_OF_16: 'Round of 16',
  QUARTER_FINAL: 'Quarter-final',
  SEMI_FINAL: 'Semi-final',
  THIRD_PLACE: 'Third place',
  FINAL: 'Final',
};

// Max squad the join-form RosterBuilder allows. Football = format size + 5
// (5v5→10, 7v7→12, 11v11→16); badminton singles = 1, doubles/mixed = 2.
export function rosterSizeFor(sport: Sport, format: TournamentFormat): number {
  if (sport === 'FOOTBALL') {
    if (format === 'FIVE_A_SIDE') return 10;
    if (format === 'SEVEN_A_SIDE') return 12;
    if (format === 'ELEVEN_A_SIDE') return 16;
    return 0;
  }
  if (format === 'MS' || format === 'WS') return 1;
  return 2; // MD / WD / MIXED
}
