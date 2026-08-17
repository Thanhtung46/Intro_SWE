import axios, { AxiosError, AxiosInstance } from 'axios';
import { API_URL } from '../config/env';
import { getToken } from '@/utils/authStorage';
import type {
  CreateMatchPayload,
  HostProfile,
  JoinMatchPayload,
  JoinRequest,
  ListMatchesQuery,
  ListMatchesResult,
  ListMineQuery,
  Match,
  MatchDetail,
} from '@/types/match';
import type { VnAdminTree } from '@/types/geo';

// REAL — wired to spot-backend's matchmaking domain (see spot-backend/CLAUDE.md
// "Figma Matches screens → API" + docs/API.md §7). Was mock-now-real-later
// (see .claude/rules/api-conventions.md); swapped once the backend was
// confirmed runnable — exported names/signatures kept stable, so no call
// site (screens/components) needed to change.
//
// Every request needs `Authorization: Bearer <token>` (spot-backend's
// `authenticate` middleware) — via src/utils/authStorage.ts's getToken(),
// per .claude/rules/api-conventions.md ("Auth tokens — always via
// expo-secure-store"). If nothing is signed in yet (no token stored),
// requests go out without the header and spot-backend will 401 — that's a
// login/session concern outside this file's scope, not something to paper
// over here.

const client: AxiosInstance = axios.create();

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Please try again.';
}

interface ApiErrorBody {
  message?: string;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Maps an AxiosError to a thrown Error with spot-backend's message when available — screens already catch + call getErrorMessage(err). */
function throwFromAxiosError(err: unknown, fallback: string): never {
  const error = err as AxiosError<ApiErrorBody>;
  if (error?.response) {
    throw new Error(error.response.data?.message || fallback);
  }
  if (error?.request) {
    throw new Error('Network error. Please check your connection and try again.');
  }
  throw new Error(fallback);
}

/**
 * GET /matches — Matches Homepage (`95:2417`) + Filter sheet (`87:1903`).
 * `location` is a substring match on venueName/venueAddress — no
 * geocoding/NLP; `province`/`city` (VN admin-unit codes) filter separately,
 * see SPOT-76 plan mục 2.1/2.7.
 */
export async function listMatches(query: ListMatchesQuery = {}): Promise<ListMatchesResult> {
  try {
    const res = await client.get(`${API_URL}/matches`, {
      params: query,
      headers: await authHeaders(),
    });
    return { matches: res.data.matches as Match[], total: res.data.total as number };
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load matches. Check your network and try again.");
  }
}

/** GET /matches/mine — "Manage Matches" (FAB > Matches tab), tab=active|completed. */
export async function listMine(query: ListMineQuery = {}): Promise<ListMatchesResult> {
  try {
    const res = await client.get(`${API_URL}/matches/mine`, {
      params: query,
      headers: await authHeaders(),
    });
    return { matches: res.data.matches as Match[], total: res.data.total as number };
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load your matches. Check your network and try again.");
  }
}

/** GET /matches/:id — Match detail (`100:401`) + Join Match sheet (`100:551`). */
export async function getMatchDetail(matchId: number): Promise<MatchDetail> {
  try {
    const res = await client.get(`${API_URL}/matches/${matchId}`, {
      headers: await authHeaders(),
    });
    return res.data as MatchDetail;
  } catch (err) {
    throwFromAxiosError(err, 'Match not found.');
  }
}

/**
 * POST /matches/:id/join — multi-guest, `join-match.dto.js` allows up to 10
 * guests + optional message/phoneNumber override. `guests[].gender` here is
 * the GENDER_RANGE fee split, not a profile edit — see SPOT-76 plan mục 2.2
 * (Gender/Skill on "You" card are read-only, only Phone + Message editable).
 */
export async function joinMatch(matchId: number, payload: JoinMatchPayload): Promise<JoinRequest> {
  try {
    const res = await client.post(`${API_URL}/matches/${matchId}/join`, payload, {
      headers: await authHeaders(),
    });
    return res.data as JoinRequest;
  } catch (err) {
    throwFromAxiosError(err, "Couldn't send your request. Check your network and try again.");
  }
}

/** POST/DELETE /matches/:id/favorite — heart icon on card/detail. */
export async function setFavorite(matchId: number, favorited: boolean): Promise<{ isFavorited: boolean }> {
  try {
    const headers = await authHeaders();
    if (favorited) {
      await client.post(`${API_URL}/matches/${matchId}/favorite`, undefined, { headers });
    } else {
      await client.delete(`${API_URL}/matches/${matchId}/favorite`, { headers });
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
    const res = await client.post(`${API_URL}/matches`, payload, {
      headers: await authHeaders(),
    });
    return res.data as Match;
  } catch (err) {
    throwFromAxiosError(err, "Couldn't create your match. Check your network and try again.");
  }
}

/**
 * GET /users/:id — Check Profile (`432:1211`). No email/phone/gender on
 * this endpoint by design; rating/reviewCount are always null/0 until the
 * Review domain ships (FE hides those sections, see SPOT-76 plan mục 2.3).
 */
export async function getHostProfile(userId: number): Promise<HostProfile> {
  try {
    const res = await client.get(`${API_URL}/users/${userId}`, {
      headers: await authHeaders(),
    });
    return res.data as HostProfile;
  } catch (err) {
    throwFromAxiosError(err, 'User not found.');
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
    const res = await client.get(`${API_URL}/geo/vn`, {
      headers: await authHeaders(),
    });
    vnAdminTreeCache = { provinces: res.data.provinces } as VnAdminTree;
    return vnAdminTreeCache;
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load the location list. Check your network and try again.");
  }
}
