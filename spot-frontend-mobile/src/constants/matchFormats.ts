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

/** Minimum maxPlayers (includes host) — mirrors MATCH_FORMAT_MIN_PLAYERS on BE. */
export const FORMAT_MIN_PLAYERS: Record<MatchFormat, number> = {
  SINGLES: 2,
  DOUBLES: 4,
  FIVE_A_SIDE: 10,
  SEVEN_A_SIDE: 14,
  ELEVEN_A_SIDE: 22,
};

export const MATCH_MAX_PLAYERS = 40;

export function minPlayersForFormat(format: MatchFormat | string | null | undefined): number {
  if (!format) return 2;
  return FORMAT_MIN_PLAYERS[format as MatchFormat] ?? 2;
}

export function formatsForSport(sport: Sport): { value: MatchFormat; label: string }[] {
  return FORMATS_BY_SPORT[sport];
}

export function formatLabel(format: MatchFormat | string | null | undefined): string {
  if (!format) return '';
  for (const options of Object.values(FORMATS_BY_SPORT)) {
    const hit = options.find((opt) => opt.value === format);
    if (hit) return hit.label;
  }
  return String(format).replace(/_/g, ' ');
}
