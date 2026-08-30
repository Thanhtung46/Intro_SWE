import apiClient from './apiClient';
import { throwFromAxiosError } from './apiErrors';
import type {
  CompleteTournamentPayload,
  CreateTournamentMatchPayload,
  CreateTournamentPayload,
  JoinTournamentPayload,
  JoinTournamentResult,
  ListMyTournamentJoinRequestsQuery,
  ListMyTournamentJoinRequestsResult,
  ListMyTournamentsQuery,
  ListMyTournamentsResult,
  ListTournamentMatchesResult,
  ListTournamentPlayersResult,
  ListTournamentRequestsResult,
  ListTournamentsQuery,
  ListTournamentsResult,
  MatchResultPayload,
  Tournament,
  TournamentDetail,
  TournamentJoinRequest,
  TournamentMatch,
  TournamentStandingsQuery,
  TournamentStandingsResult,
  UpdateTournamentMatchPayload,
  UpdateTournamentPayload,
} from '@/types/tournament';

// REAL — wired to spot-backend's tournaments domain (see spot-backend/CLAUDE.md
// "Tournaments (giải đấu)" + docs/API.md §9). Mirrors groupService.ts /
// matchService.ts exactly: apiClient for the 401→refresh→retry interceptor
// chain, throwFromAxiosError for consistent error surfacing, explicit
// response-envelope unwrapping — never a blind `res.data as X` cast.
//
// There is NO eligibility pre-check endpoint: POST /tournaments returns 403 when
// the caller isn't an eligible organizer (80 COMPLETED hosted kèo + host rating
// ≥ 4.5). Callers handle that 403 themselves.

/** GET /tournaments — Tournaments sub-tab browse (Homepage). */
export async function listTournaments(
  query: ListTournamentsQuery = {}
): Promise<ListTournamentsResult> {
  try {
    const res = await apiClient.get('/tournaments', { params: query });
    return {
      total: res.data.total as number,
      limit: res.data.limit as number,
      offset: res.data.offset as number,
      suggestions: res.data.suggestions,
      tournaments: res.data.tournaments as Tournament[],
    };
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load tournaments. Check your network and try again.");
  }
}

/** GET /tournaments/:id — Tournament Detail (Overview tab + shared fetch for the other tabs). */
export async function getTournamentDetail(tournamentId: number): Promise<TournamentDetail> {
  try {
    const res = await apiClient.get(`/tournaments/${tournamentId}`);
    return res.data.tournament as TournamentDetail;
  } catch (err) {
    throwFromAxiosError(err, 'Tournament not found.');
  }
}

/** POST /tournaments — Create Tournament submit. 403 if the caller isn't an eligible organizer. */
export async function createTournament(
  payload: CreateTournamentPayload
): Promise<Tournament> {
  try {
    const res = await apiClient.post<{ tournament: Tournament }>('/tournaments', payload);
    return res.data.tournament;
  } catch (err) {
    throwFromAxiosError(err, "Couldn't create your tournament. Check your network and try again.");
  }
}

/** PATCH /tournaments/:id — Edit Tournament / organizer field edits / winners / playerRanks. Organizer-only; 400 on empty body; venue+schedule fields 400 after ACTIVE. */
export async function updateTournament(
  tournamentId: number,
  payload: UpdateTournamentPayload
): Promise<Tournament> {
  try {
    const res = await apiClient.patch<{ tournament: Tournament }>(
      `/tournaments/${tournamentId}`,
      payload
    );
    return res.data.tournament;
  } catch (err) {
    throwFromAxiosError(err, "Couldn't save your changes. Check your network and try again.");
  }
}

/** POST /tournaments/:id/cancel — organizer cancel, before startsAt only. */
export async function cancelTournament(tournamentId: number): Promise<void> {
  try {
    await apiClient.post(`/tournaments/${tournamentId}/cancel`);
  } catch (err) {
    throwFromAxiosError(err, "Couldn't cancel this tournament. Check your network and try again.");
  }
}

/** POST /tournaments/:id/complete — early complete when ACTIVE, optional winners. */
export async function completeTournament(
  tournamentId: number,
  payload: CompleteTournamentPayload = {}
): Promise<Tournament> {
  try {
    const res = await apiClient.post<{ tournament: Tournament }>(
      `/tournaments/${tournamentId}/complete`,
      payload
    );
    return res.data.tournament;
  } catch (err) {
    throwFromAxiosError(err, "Couldn't complete this tournament. Check your network and try again.");
  }
}

/** POST /tournaments/:id/join — captain registration. Always creates a PENDING request. */
export async function joinTournament(
  tournamentId: number,
  payload: JoinTournamentPayload
): Promise<JoinTournamentResult> {
  try {
    const res = await apiClient.post<JoinTournamentResult>(
      `/tournaments/${tournamentId}/join`,
      payload
    );
    return {
      message: res.data.message,
      request: res.data.request,
      tournament: res.data.tournament,
    };
  } catch (err) {
    throwFromAxiosError(err, "Couldn't send your join request. Check your network and try again.");
  }
}

/** DELETE /tournaments/:id/join — withdraw own PENDING request (before deadline, not FULL). */
export async function withdrawTournamentJoin(tournamentId: number): Promise<void> {
  try {
    await apiClient.delete(`/tournaments/${tournamentId}/join`);
  } catch (err) {
    throwFromAxiosError(err, "Couldn't withdraw your request. Check your network and try again.");
  }
}

/** GET /tournaments/:id/requests — organizer per-tournament PENDING list (roster + captain phone). */
export async function listTournamentRequests(
  tournamentId: number
): Promise<TournamentJoinRequest[]> {
  try {
    const res = await apiClient.get<ListTournamentRequestsResult>(
      `/tournaments/${tournamentId}/requests`
    );
    return res.data.requests;
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load join requests. Check your network and try again.");
  }
}

/** POST /tournaments/:id/requests/:requestId/accept — organizer approve. At cap → FULL. */
export async function acceptTournamentRequest(
  tournamentId: number,
  requestId: number
): Promise<void> {
  try {
    await apiClient.post(`/tournaments/${tournamentId}/requests/${requestId}/accept`);
  } catch (err) {
    throwFromAxiosError(err, "Couldn't approve this request. Check your network and try again.");
  }
}

/** POST /tournaments/:id/requests/:requestId/reject — organizer decline. Captain may re-apply. */
export async function rejectTournamentRequest(
  tournamentId: number,
  requestId: number
): Promise<void> {
  try {
    await apiClient.post(`/tournaments/${tournamentId}/requests/${requestId}/reject`);
  } catch (err) {
    throwFromAxiosError(err, "Couldn't decline this request. Check your network and try again.");
  }
}

/** POST /tournaments/:id/teams/:teamId/kick — organizer remove an accepted team, before startsAt. Terminal. */
export async function kickTournamentTeam(
  tournamentId: number,
  teamId: number
): Promise<void> {
  try {
    await apiClient.post(`/tournaments/${tournamentId}/teams/${teamId}/kick`);
  } catch (err) {
    throwFromAxiosError(err, "Couldn't remove this team. Check your network and try again.");
  }
}

/** GET /tournaments/mine — Manage Tournaments. Returns the raw envelope: tab/section decide whether `tournaments` or `requests` is populated. */
export async function listMyTournaments(
  query: ListMyTournamentsQuery = {}
): Promise<ListMyTournamentsResult> {
  try {
    const res = await apiClient.get('/tournaments/mine', { params: query });
    return {
      total: res.data.total,
      limit: res.data.limit,
      offset: res.data.offset,
      pendingCount: res.data.pendingCount,
      tournaments: res.data.tournaments,
      requests: res.data.requests,
    };
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load your tournaments. Check your network and try again.");
  }
}

/** GET /tournaments/my-join-requests — Manage Tournaments "My Join Requests" (captain's own PENDING + REJECTED). */
export async function listMyTournamentJoinRequests(
  query: ListMyTournamentJoinRequestsQuery = {}
): Promise<ListMyTournamentJoinRequestsResult> {
  try {
    const res = await apiClient.get('/tournaments/my-join-requests', { params: query });
    return {
      total: res.data.total,
      pendingCount: res.data.pendingCount,
      limit: res.data.limit,
      offset: res.data.offset,
      requests: res.data.requests,
    };
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load your join requests. Check your network and try again.");
  }
}

/** POST/DELETE /tournaments/:id/favorite — heart on card/detail. */
export async function setTournamentFavorite(
  tournamentId: number,
  favorited: boolean
): Promise<{ isFavorited: boolean }> {
  try {
    if (favorited) {
      await apiClient.post(`/tournaments/${tournamentId}/favorite`);
    } else {
      await apiClient.delete(`/tournaments/${tournamentId}/favorite`);
    }
    return { isFavorited: favorited };
  } catch (err) {
    throwFromAxiosError(err, "Couldn't update favorite. Check your network and try again.");
  }
}

/** GET /tournaments/:id/players — Players tab: accepted teams + roster (sorted by rank). */
export async function getTournamentPlayers(
  tournamentId: number
): Promise<ListTournamentPlayersResult> {
  try {
    const res = await apiClient.get(`/tournaments/${tournamentId}/players`);
    return { tournamentId: res.data.tournamentId, teams: res.data.teams };
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load players. Check your network and try again.");
  }
}

/** GET /tournaments/:id/standings — Standings tab. Optional `round` filter. */
export async function getTournamentStandings(
  tournamentId: number,
  query: TournamentStandingsQuery = {}
): Promise<TournamentStandingsResult> {
  try {
    const res = await apiClient.get(`/tournaments/${tournamentId}/standings`, { params: query });
    return {
      tournamentId: res.data.tournamentId,
      sport: res.data.sport,
      round: res.data.round,
      standings: res.data.standings,
    };
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load standings. Check your network and try again.");
  }
}

/** GET /tournaments/:id/matches — Matches tab. FE groups by `match.round` (no `currentRound` on the tournament). */
export async function listTournamentMatches(
  tournamentId: number
): Promise<TournamentMatch[]> {
  try {
    const res = await apiClient.get<ListTournamentMatchesResult>(
      `/tournaments/${tournamentId}/matches`
    );
    return res.data.matches;
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load matches. Check your network and try again.");
  }
}

/** POST /tournaments/:id/matches — organizer add a match. */
export async function createTournamentMatch(
  tournamentId: number,
  payload: CreateTournamentMatchPayload
): Promise<TournamentMatch> {
  try {
    const res = await apiClient.post<{ match: TournamentMatch }>(
      `/tournaments/${tournamentId}/matches`,
      payload
    );
    return res.data.match;
  } catch (err) {
    throwFromAxiosError(err, "Couldn't create this match. Check your network and try again.");
  }
}

/** PATCH /tournaments/:id/matches/:matchId — organizer reschedule / change teams (changing teams clears the result). */
export async function updateTournamentMatch(
  tournamentId: number,
  matchId: number,
  payload: UpdateTournamentMatchPayload
): Promise<TournamentMatch> {
  try {
    const res = await apiClient.patch<{ match: TournamentMatch }>(
      `/tournaments/${tournamentId}/matches/${matchId}`,
      payload
    );
    return res.data.match;
  } catch (err) {
    throwFromAxiosError(err, "Couldn't update this match. Check your network and try again.");
  }
}

/** PATCH /tournaments/:id/matches/:matchId/result — football `{teamAGoals, teamBGoals}` / badminton `{sets: [...]}`. */
export async function setTournamentMatchResult(
  tournamentId: number,
  matchId: number,
  payload: MatchResultPayload
): Promise<TournamentMatch> {
  try {
    const res = await apiClient.patch<{ match: TournamentMatch }>(
      `/tournaments/${tournamentId}/matches/${matchId}/result`,
      payload
    );
    return res.data.match;
  } catch (err) {
    throwFromAxiosError(err, "Couldn't save this result. Check your network and try again.");
  }
}

/** DELETE /tournaments/:id/matches/:matchId — organizer remove a match. */
export async function deleteTournamentMatch(
  tournamentId: number,
  matchId: number
): Promise<void> {
  try {
    await apiClient.delete(`/tournaments/${tournamentId}/matches/${matchId}`);
  } catch (err) {
    throwFromAxiosError(err, "Couldn't delete this match. Check your network and try again.");
  }
}
