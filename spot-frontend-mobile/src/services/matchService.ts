import apiClient from './apiClient';
import { getErrorMessage, throwFromAxiosError } from './apiErrors';
import type {
  CreateMatchBulkPayload,
  CreateMatchPayload,
  HostProfile,
  HostReviewsResult,
  JoinMatchPayload,
  JoinRequest,
  ListMatchesQuery,
  ListMatchesResult,
  ListMineQuery,
  ListMyJoinRequestsResult,
  Match,
  MatchDetail,
  Sport,
  VenueSuggestion,
} from '@/types/match';
import type { VnAdminTree } from '@/types/geo';

// REAL — wired to spot-backend's matchmaking domain (see spot-backend/CLAUDE.md
// "Figma Matches screens → API" + docs/API.md §7). Was mock-now-real-later
// (see .claude/rules/api-conventions.md); swapped once the backend was
// confirmed runnable — exported names/signatures kept stable, so no call
// site (screens/components) needed to change.
//
// Routed through src/services/apiClient.ts (not a standalone axios
// instance) so every call here gets its Authorization header attached
// automatically *and* gets the 401 → refresh-token → retry handling that
// lives on apiClient's interceptors. This file used to have its own plain
// `axios.create()` + a manual authHeaders() helper with none of that retry
// logic — meaning the access token (15 min TTL) expiring mid-session
// surfaced as an un-recoverable "Invalid or expired token" on every Matches
// screen instead of silently refreshing like the rest of the app already
// does. Fixed by switching to apiClient; paths below are relative
// (apiClient already carries `baseURL: API_URL`).

// getErrorMessage/throwFromAxiosError now live in ./apiErrors.ts (shared
// with groupService.ts) — re-exported here so existing call sites
// (`import { getErrorMessage } from '@/services/matchService'`) keep working.
export { getErrorMessage };

/**
 * Flatten list query for axios: arrays → CSV (`format=SINGLES,DOUBLES`).
 * Avoids `format[]=` which some runtimes drop so Format filter never applies.
 */
function toMatchListParams(query: ListMatchesQuery): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {};
  (Object.entries(query) as [keyof ListMatchesQuery, ListMatchesQuery[keyof ListMatchesQuery]][]).forEach(
    ([key, value]) => {
      if (value === undefined || value === null) return;
      if (Array.isArray(value)) {
        if (value.length === 0) return;
        params[key] = value.join(',');
        return;
      }
      params[key] = value as string | number | boolean;
    }
  );
  return params;
}

/**
 * GET /matches — Matches Homepage (`95:2417`) + Filter sheet (`87:1903`).
 * `location` is a substring match on venueName/venueAddress — no
 * geocoding/NLP; `province`/`city` (VN admin-unit codes) filter separately,
 * see SPOT-76 plan mục 2.1/2.7.
 */
export async function listMatches(query: ListMatchesQuery = {}): Promise<ListMatchesResult> {
  try {
    const res = await apiClient.get('/matches', { params: toMatchListParams(query) });
    return {
      matches: res.data.matches as Match[],
      total: res.data.total as number,
      suggestions: res.data.suggestions as ListMatchesResult['suggestions'],
    };
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load matches. Check your network and try again.");
  }
}

/** GET /matches/mine — "Manage Matches" (FAB > Matches tab), tab=active|completed. */
export async function listMine(query: ListMineQuery = {}): Promise<ListMatchesResult> {
  try {
    const res = await apiClient.get('/matches/mine', { params: query });
    return { matches: res.data.matches as Match[], total: res.data.total as number };
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load your matches. Check your network and try again.");
  }
}

/** GET /matches/my-join-requests — Manage Matches "Requests" tab (joiner's own PENDING + REJECTED). */
export async function listMyJoinRequests(
  query: { status?: 'PENDING' | 'REJECTED'; limit?: number; offset?: number } = {}
): Promise<ListMyJoinRequestsResult> {
  try {
    const res = await apiClient.get('/matches/my-join-requests', { params: query });
    return {
      requests: res.data.requests,
      total: res.data.total,
      pendingCount: res.data.pendingCount,
    };
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load your join requests. Check your network and try again.");
  }
}

/** DELETE /matches/:id/join — participant cancels their own PENDING join request. */
export async function cancelJoinRequest(matchId: number): Promise<void> {
  try {
    await apiClient.delete(`/matches/${matchId}/join`);
  } catch (err) {
    throwFromAxiosError(err, "Couldn't cancel your request. Check your network and try again.");
  }
}

/** GET /matches/:id/requests — host's waiting list (Manage Squad "Pending Approval"), PENDING only. */
export async function listMatchRequests(matchId: number): Promise<JoinRequest[]> {
  try {
    const res = await apiClient.get(`/matches/${matchId}/requests`);
    return res.data.requests as JoinRequest[];
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load join requests. Check your network and try again.");
  }
}

/** POST /matches/:id/requests/:requestId/accept — Manage Squad "Approve". */
export async function acceptJoinRequest(matchId: number, requestId: number): Promise<void> {
  try {
    await apiClient.post(`/matches/${matchId}/requests/${requestId}/accept`);
  } catch (err) {
    throwFromAxiosError(err, "Couldn't approve this request. Check your network and try again.");
  }
}

/** POST /matches/:id/requests/:requestId/reject — Manage Squad "Decline". */
export async function rejectJoinRequest(matchId: number, requestId: number): Promise<void> {
  try {
    await apiClient.post(`/matches/${matchId}/requests/${requestId}/reject`);
  } catch (err) {
    throwFromAxiosError(err, "Couldn't decline this request. Check your network and try again.");
  }
}

/** POST /matches/:id/participants/:userId/kick — Manage Squad "Kick" (host-only, ACCEPTED joiners + their guests; kicked user can't rejoin this kèo). */
export async function kickParticipant(matchId: number, userId: number): Promise<void> {
  try {
    await apiClient.post(`/matches/${matchId}/participants/${userId}/kick`);
  } catch (err) {
    throwFromAxiosError(err, "Couldn't kick this player. Check your network and try again.");
  }
}

/** GET /matches/:id — Match detail (`100:401`) + Join Match sheet (`100:551`). */
export async function getMatchDetail(matchId: number): Promise<MatchDetail> {
  try {
    const res = await apiClient.get(`/matches/${matchId}`);
    return res.data as MatchDetail;
  } catch (err) {
    throwFromAxiosError(err, 'Match not found.');
  }
}

export type JoinMatchResult = {
  request: JoinRequest;
  skillWarning: boolean;
  warning: string | null;
};

/**
 * POST /matches/:id/join — multi-guest, `join-match.dto.js` allows up to 10
 * guests + optional message/phoneNumber override. `guests[].gender` here is
 * the GENDER_RANGE fee split, not a profile edit — see SPOT-76 plan mục 2.2
 * (Gender/Skill on "You" card are read-only, only Phone + Message editable).
 *
 * Response is { message, skillWarning, warning, request, match } — not a
 * flat JoinRequest (same shape mistake as getMe()/hostMatch() before those
 * were fixed). skillWarning/warning were silently dropped by the old
 * `res.data as JoinRequest` cast, so joining out-of-range never surfaced
 * spot-backend's "skill mismatch — warns but still joins" warning anywhere.
 */
export async function joinMatch(matchId: number, payload: JoinMatchPayload): Promise<JoinMatchResult> {
  try {
    const res = await apiClient.post<JoinMatchResult>(`/matches/${matchId}/join`, payload);
    return { request: res.data.request, skillWarning: res.data.skillWarning, warning: res.data.warning };
  } catch (err) {
    throwFromAxiosError(err, "Couldn't send your request. Check your network and try again.");
  }
}

/** POST/DELETE /matches/:id/favorite — heart icon on card/detail. */
export async function setFavorite(matchId: number, favorited: boolean): Promise<{ isFavorited: boolean }> {
  try {
    if (favorited) {
      await apiClient.post(`/matches/${matchId}/favorite`);
    } else {
      await apiClient.delete(`/matches/${matchId}/favorite`);
    }
    return { isFavorited: favorited };
  } catch (err) {
    throwFromAxiosError(err, "Couldn't update favorite. Check your network and try again.");
  }
}

/**
 * POST /matches — "Host a Match" (FAB > Matches tab). Not one of the
 * original 6 Figma screens for SPOT-76 (see plan mục 4 "Bổ sung scope"),
 * wired here so the FAB action has somewhere to call.
 */
export async function hostMatch(payload: CreateMatchPayload): Promise<Match> {
  try {
    // POST /matches responds { message, match: {...} } — unwrap it, same
    // shape mistake as getMe()/getHostProfile() before this was fixed.
    const res = await apiClient.post<{ match: Match }>('/matches', payload);
    return res.data.match;
  } catch (err) {
    throwFromAxiosError(err, "Couldn't create your match. Check your network and try again.");
  }
}

export type HostMatchBulkResult = {
  totalRequested: number;
  totalCreated: number;
  created: Match[];
  failed: { startsAt: string; endsAt: string; message: string; details?: unknown }[];
};

/**
 * POST /matches/bulk — recurring kèo (Vmito-style multi-publish). Partial
 * failures (409 per slot, e.g. pitch already booked) come back in `failed`
 * alongside whatever did succeed in `created` — this only throws when
 * *every* slot failed (spot-backend/CLAUDE.md "Recurring / N kèo").
 */
export async function hostMatchBulk(payload: CreateMatchBulkPayload): Promise<HostMatchBulkResult> {
  try {
    const res = await apiClient.post<HostMatchBulkResult>('/matches/bulk', payload);
    return res.data;
  } catch (err) {
    throwFromAxiosError(err, "Couldn't create your matches. Check your network and try again.");
  }
}

/**
 * GET /matches/venue-suggestions — Host form location picker (wider pool
 * than Homepage browse; `location` is required, min 1 char).
 */
export async function getVenueSuggestions(location: string, sport?: Sport): Promise<VenueSuggestion[]> {
  try {
    const res = await apiClient.get<{ suggestions: VenueSuggestion[] }>('/matches/venue-suggestions', {
      params: { location, sport },
    });
    return res.data.suggestions;
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load venue suggestions. Check your network and try again.");
  }
}

/**
 * GET /users/:id — Check Profile (`432:1211`). No email/phone/gender on
 * this endpoint by design; rating/reviewCount are always null/0 until the
 * Review domain ships (FE hides those sections, see SPOT-76 plan mục 2.3).
 */
export async function getHostProfile(userId: number): Promise<HostProfile> {
  try {
    // GET /users/:id responds { user: {...} }, not the profile flat at the
    // top level — unwrap it here so callers get HostProfile directly (same
    // response shape as GET /auth/me, see authService.ts's getMe()).
    const res = await apiClient.get<{ user: HostProfile }>(`/users/${userId}`);
    return res.data.user;
  } catch (err) {
    throwFromAxiosError(err, 'User not found.');
  }
}

/** GET /reviews/hosts/:userId/reviews — Check Profile's Reviews section. */
export async function getHostReviews(userId: number, limit = 20): Promise<HostReviewsResult> {
  try {
    const res = await apiClient.get(`/reviews/hosts/${userId}/reviews`, { params: { limit } });
    return res.data as HostReviewsResult;
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load reviews. Check your network and try again.");
  }
}

let vnAdminTreeCache: VnAdminTree | null = null;

/**
 * GET /geo/vn (+ /api/geo/vn) — Vietnam admin-unit tree, backs FilterSheet's
 * Province/City dropdowns (SPOT-76 plan mục 2.1, resolved by spot-backend
 * commit 84474d2). Static data, so cached module-level — no reason to
 * re-request it on every FilterSheet open within the same app session.
 */
export async function getVnAdminTree(): Promise<VnAdminTree> {
  if (vnAdminTreeCache) return vnAdminTreeCache;
  try {
    const res = await apiClient.get('/geo/vn');
    vnAdminTreeCache = { provinces: res.data.provinces } as VnAdminTree;
    return vnAdminTreeCache;
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load the location list. Check your network and try again.");
  }
}
