import type { MatchFormat, Sport } from '@/types/match';

// Mirrors spot-backend/src/shared/constants/matchmaking.js's
// MATCH_FORMATS_BY_SPORT — keep in sync if that file changes.
const FORMATS_BY_SPORT: Record<Sport, { value: MatchFormat; label: string }[]> = {
  BADMINTON: [
    { value: 'SINGLES', label: 'Singles' },
    { value: 'DOUBLES', label: 'Doubles' },
  ],
  FOOTBALL: [
    { value: 'FIVE_A_SIDE', label: '5-a-side' },
    { value: 'SEVEN_A_SIDE', label: '7-a-side' },
    { value: 'ELEVEN_A_SIDE', label: '11-a-side' },
  ],
};

export function formatsForSport(sport: Sport): { value: MatchFormat; label: string }[] {
  return FORMATS_BY_SPORT[sport];
}
