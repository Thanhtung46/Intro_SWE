import { createStaleCache } from './createStaleCache';
import type { Match } from '@/types/match';

export type MatchesCacheData = { matches: Match[]; total: number };

/** Matches tab's "matches" sub-tab first page — Groups/Tournaments sub-tabs have their own screens/state. */
export const useMatchesCache = createStaleCache<MatchesCacheData>();
