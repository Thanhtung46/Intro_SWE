import type { Sport } from '@/types/match';

export type MatchCoverFallback = {
  emoji: string;
  label: string;
  gradient: [string, string];
};

/** Shown when a kèo has no `coverUrl` (Vmito import gap or host skipped cover). */
export const MATCH_COVER_FALLBACK: Record<Sport, MatchCoverFallback> = {
  BADMINTON: {
    emoji: '🏸',
    label: 'Cầu lông',
    gradient: ['#22C55E', '#15803D'],
  },
  FOOTBALL: {
    emoji: '⚽',
    label: 'Bóng đá',
    gradient: ['#3B82F6', '#1D4ED8'],
  },
};
