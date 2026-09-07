import apiClient from './apiClient';

export interface SuggestedSlot {
  fieldId: number;
  startsAt: string;
  endsAt: string;
}

export interface RecommendationItem {
  venueId: number;
  venueName: string;
  address: string;
  sport: string;
  score: number;
  distanceKm?: number | null;
  suggestedSlots: SuggestedSlot[];
}

export interface RecommendationsResult {
  success: boolean;
  items?: RecommendationItem[];
  fallback?: boolean;
}

type Sport = 'football' | 'badminton';

const SPORT_TO_API: Record<Sport, string> = {
  football: 'FOOTBALL',
  badminton: 'BADMINTON',
};

/**
 * GET /recommendations?sport=... — a non-200 or network error resolves to
 * `{ success: false }` rather than throwing, so the Home screen can simply
 * omit the "Suggested for you" section (spec FR-004) instead of needing its
 * own try/catch around every call site.
 */
export async function getRecommendations(sport: Sport): Promise<RecommendationsResult> {
  try {
    const res = await apiClient.get<{ items: RecommendationItem[]; fallback: boolean }>(
      '/recommendations',
      { params: { sport: SPORT_TO_API[sport] } },
    );
    return { success: true, items: res.data.items, fallback: res.data.fallback };
  } catch {
    return { success: false };
  }
}
