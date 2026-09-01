import type { MatchFormat, Sport } from '@/types/match';

// Mirrors spot-backend/src/shared/constants/matchmaking.js's
// MATCH_FORMATS_BY_SPORT — keep in sync if that file changes.
const FORMATS_BY_SPORT: Record<Sport, { value: MatchFormat; label: string }[]> = {
  BADMINTON: [
    { value: 'SINGLES', label: 'Singles' },
    { value: 'DOUBLES', label: 'Doubles' },
  ],
  FOOTBALL: [
    { value: 'FIVE_A_SIDE', label: '5v5' },
    { value: 'SEVEN_A_SIDE', label: '7v7' },
    { value: 'ELEVEN_A_SIDE', label: '11v11' },
  ],
};

export function formatsForSport(sport: Sport): { value: MatchFormat; label: string }[] {
  return FORMATS_BY_SPORT[sport];
}
