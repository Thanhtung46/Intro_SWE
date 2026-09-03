import type { DocumentPickerAsset } from 'expo-document-picker';

import apiClient from './apiClient';
import { throwFromAxiosError } from './apiErrors';
import type {
  AssignmentDetail,
  AssignmentListPayload,
  BoardQuery,
  BoardResult,
  EarningsHistoryResponse,
  EarningsMonthlyResponse,
  EarningsResponse,
  MatchInvitation,
  PendingInvitationsPayload,
  RefereeCertification,
  RefereeProfile,
  ScheduleResponse,
  VenueRegistration,
  VerificationDocumentInput,
} from '@/types/referee';
import type { RefereeBoardFilters } from '@/types/refereeFilters';

// REAL — wired to spot-backend's referee domain (spot-backend/docs/API.md
// §19 + src/domains/referee/*). Base paths mounted at both `/referee` and
// `/api/referee`; apiClient's baseURL already carries `/api`, so paths here
// are `/referee/...`. Every endpoint requires Bearer + role REFEREE +
// status ACTIVE (a PENDING referee is blocked at login and never reaches
// these). Mirrors groupService.ts exactly: apiClient for the
// 401→refresh→retry chain, throwFromAxiosError for consistent surfacing,
// explicit envelope unwrapping (never a blind `res.data as X`).
//
// The onboarding batch-submit endpoint (POST
// /users/me/verification-requests/batch) lives OUTSIDE the /referee prefix
// and is authed with the token issued at OTP-verify — kept here because it
// is part of the referee flow.

/** GET /referee/me — referee profile + certified sports + stats. */
export async function getRefereeMe(): Promise<RefereeProfile> {
  try {
    const res = await apiClient.get('/referee/me');
    return res.data.profile as RefereeProfile;
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load your referee profile. Check your network and try again.");
  }
}

/**
 * POST /referee/me/activation-ack — mark the one-time "Account Activated"
 * celebration as seen (server-side, cross-device). Idempotent. Call
 * fire-and-forget from the activated screen's CTA.
 */
export async function acknowledgeRefereeActivation(): Promise<void> {
  try {
    await apiClient.post('/referee/me/activation-ack');
  } catch (err) {
    throwFromAxiosError(err, "Couldn't sync your activation status.");
  }
}

/** GET /referee/me/certifications — uploaded documents + their review status.
 *  ACTIVE-only (all /referee/* routes require an active account). */
export async function getRefereeCertifications(): Promise<RefereeCertification[]> {
  try {
    const res = await apiClient.get('/referee/me/certifications');
    return res.data.certifications as RefereeCertification[];
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load your certifications. Check your network and try again.");
  }
}

/** GET /users/me/verification-requests — the caller's own submitted documents.
 *  Works while PENDING (unlike getRefereeCertifications), so the "under review"
 *  screen can show submission status before an admin approves. */
export async function getMyVerificationRequests(): Promise<RefereeCertification[]> {
  try {
    const res = await apiClient.get('/users/me/verification-requests');
    return res.data.requests as RefereeCertification[];
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load your submitted documents. Check your network and try again.");
  }
}

/** GET /referee/board — Job Board. `sport` is required; caller must be
 *  certified for it (403 otherwise). */
export async function getRefereeBoard(query: BoardQuery): Promise<BoardResult> {
  try {
    const res = await apiClient.get('/referee/board', { params: query });
    return {
      sport: res.data.sport,
      page: res.data.page,
      limit: res.data.limit,
      venues: res.data.venues,
    };
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load the job board. Check your network and try again.");
  }
}

/** Maps the filter-sheet output + current sport/search into board query
 *  params, enforcing the Location XOR Distance rule the API requires. */
export function buildBoardQuery(
  sport: string,
  filters: RefereeBoardFilters,
  opts: { q?: string; page?: number; limit?: number } = {}
): BoardQuery {
  const query: BoardQuery = { sport };
  if (opts.q?.trim()) query.q = opts.q.trim();
  if (opts.page) query.page = opts.page;
  if (opts.limit) query.limit = opts.limit;

  if (filters.mode === 'distance' && filters.lat != null && filters.lng != null) {
    query.lat = filters.lat;
    query.lng = filters.lng;
    query.radiusKm = filters.radiusKm;
  } else {
    if (filters.province) query.province = filters.province;
    if (filters.province && filters.city) query.city = filters.city;
    if (filters.favoritedOnly) query.favorited = true;
  }
  return query;
}

/** POST | DELETE /referee/venues/:venueId/favorite — heart on a board card. */
export async function setVenueFavorite(venueId: number, favorited: boolean): Promise<{ isFavorited: boolean }> {
  try {
    if (favorited) {
      await apiClient.post(`/referee/venues/${venueId}/favorite`);
    } else {
      await apiClient.delete(`/referee/venues/${venueId}/favorite`);
    }
    return { isFavorited: favorited };
  } catch (err) {
    throwFromAxiosError(err, "Couldn't update favorite. Check your network and try again.");
  }
}

/** POST /referee/venues/:venueId/register — "Apply" on a board card. Adds
 *  the referee to that venue's pool for `sportType`; venue then hides from
 *  the board. */
export async function registerVenue(venueId: number, sportType: string): Promise<VenueRegistration> {
  try {
    const res = await apiClient.post(`/referee/venues/${venueId}/register`, { sportType });
    return res.data.registration as VenueRegistration;
  } catch (err) {
    throwFromAxiosError(err, "Couldn't apply to this venue. Check your network and try again.");
  }
}

/** DELETE /referee/venues/:venueId/register — "Cancel" on the My Venues
 *  section. Keeps existing ACCEPTED assignments; auto-cancels PENDING ones
 *  at that venue; venue reappears on the board. */
export async function cancelVenueRegistration(venueId: number, sportType: string): Promise<VenueRegistration> {
  try {
    const res = await apiClient.delete(`/referee/venues/${venueId}/register`, { data: { sportType } });
    return res.data.registration as VenueRegistration;
  } catch (err) {
    throwFromAxiosError(err, "Couldn't cancel this registration. Check your network and try again.");
  }
}

/** GET /referee/invitations?tab=pending — Plan A single payload. */
export async function getPendingInvitations(): Promise<PendingInvitationsPayload> {
  try {
    const res = await apiClient.get('/referee/invitations', { params: { tab: 'pending' } });
    return {
      tab: 'pending',
      matchInvitations: res.data.matchInvitations ?? [],
      myVenues: res.data.myVenues ?? [],
    };
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load your invitations. Check your network and try again.");
  }
}

/** GET /referee/invitations?tab=confirmed|completed. */
export async function getAssignmentList(
  tab: 'confirmed' | 'completed',
  opts: { since?: string; filter?: 'all' | 'completed' | 'declined' } = {}
): Promise<AssignmentListPayload> {
  try {
    const params: Record<string, string> = { tab };
    if (tab === 'completed') {
      params.since = opts.since ?? '30d';
      params.filter = opts.filter ?? 'all';
    }
    const res = await apiClient.get('/referee/invitations', { params });
    return {
      tab,
      since: res.data.since,
      filter: res.data.filter,
      assignments: (res.data.assignments ?? []) as MatchInvitation[],
    };
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load your matches. Check your network and try again.");
  }
}

/** GET /referee/assignments/:id — detail (404 if not owned by caller). */
export async function getAssignmentDetail(assignmentId: number): Promise<AssignmentDetail> {
  try {
    const res = await apiClient.get(`/referee/assignments/${assignmentId}`);
    return res.data.assignment as AssignmentDetail;
  } catch (err) {
    throwFromAxiosError(err, 'Assignment not found.');
  }
}

/** POST /referee/assignments/:id/accept — first-accept-wins. 409 with
 *  details.code === 'ASSIGNMENT_ALREADY_TAKEN' when another referee won. */
export async function acceptAssignment(assignmentId: number): Promise<AssignmentDetail> {
  try {
    const res = await apiClient.post(`/referee/assignments/${assignmentId}/accept`);
    return res.data.assignment as AssignmentDetail;
  } catch (err) {
    throwFromAxiosError(err, "Couldn't accept this match. Check your network and try again.");
  }
}

/** POST /referee/assignments/:id/decline — optional reason (1–500 chars). */
export async function declineAssignment(assignmentId: number, reason?: string): Promise<AssignmentDetail> {
  try {
    const res = await apiClient.post(
      `/referee/assignments/${assignmentId}/decline`,
      reason?.trim() ? { reason: reason.trim() } : {}
    );
    return res.data.assignment as AssignmentDetail;
  } catch (err) {
    throwFromAxiosError(err, "Couldn't decline this match. Check your network and try again.");
  }
}

/** GET /referee/schedule?month=YYYY-MM (default = current month, Asia/Bangkok). */
export async function getRefereeSchedule(month?: string): Promise<ScheduleResponse> {
  try {
    const res = await apiClient.get('/referee/schedule', { params: month ? { month } : {} });
    return res.data as ScheduleResponse;
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load your schedule. Check your network and try again.");
  }
}

/** GET /referee/earnings?month=YYYY-MM. */
export async function getRefereeEarnings(month?: string): Promise<EarningsResponse> {
  try {
    const res = await apiClient.get('/referee/earnings', { params: month ? { month } : {} });
    return res.data as EarningsResponse;
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load your earnings. Check your network and try again.");
  }
}

/** GET /referee/earnings/monthly?anchor=YYYY-MM&months=N — monthly totals for the trend chart. */
export async function getRefereeEarningsMonthly(
  opts: { anchor?: string; months?: number } = {},
): Promise<EarningsMonthlyResponse> {
  try {
    const params: Record<string, string | number> = {};
    if (opts.anchor) params.anchor = opts.anchor;
    if (opts.months) params.months = opts.months;
    const res = await apiClient.get('/referee/earnings/monthly', { params });
    return res.data as EarningsMonthlyResponse;
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load your earnings. Check your network and try again.");
  }
}

/** GET /referee/earnings/history?limit=&offset=. */
export async function getRefereeEarningsHistory(
  opts: { month?: string; limit?: number; offset?: number } = {},
): Promise<EarningsHistoryResponse> {
  try {
    const params: Record<string, string | number> = {
      limit: opts.limit ?? 20,
      offset: opts.offset ?? 0,
    };
    if (opts.month) params.month = opts.month;
    const res = await apiClient.get('/referee/earnings/history', { params });
    return res.data as EarningsHistoryResponse;
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load your earnings history. Check your network and try again.");
  }
}

/**
 * DEV STUB — turn a picked file into a public http(s) URL for the
 * verification batch. The app has NO file/image upload pipeline anywhere
 * (every other image field — group cover/logo/gallery, match coverUrl —
 * is a pasted URL); wiring real Supabase Storage upload is a separate
 * follow-up ticket (SPOT-93 PR note). Until then this returns a stable
 * placeholder URL derived from the asset name so the onboarding flow is
 * end-to-end testable, and RefereeRegisterScreen also exposes the URL as
 * an editable paste field.
 */
export async function uploadRefereeDocument(asset: DocumentPickerAsset): Promise<string> {
  const safeName = (asset.name || 'document').replace(/[^a-zA-Z0-9._-]/g, '-');
  // TODO(SPOT-93 follow-up): replace with a real storage upload returning a public URL.
  return `https://spot-uploads.example.com/referee-docs/${Date.now()}-${safeName}`;
}

/**
 * POST /users/me/verification-requests/batch — the 3-doc referee signup
 * submission. Auth = the access token issued at OTP-verify for the PENDING
 * referee (already stored by the OTP route). Exactly 3 documents, one each
 * of ID_FRONT / ID_BACK / VFF_LICENSE. 409 if a pending doc of that kind
 * already exists.
 */
export async function submitRefereeVerificationBatch(documents: VerificationDocumentInput[]): Promise<void> {
  try {
    await apiClient.post('/users/me/verification-requests/batch', { documents });
  } catch (err) {
    throwFromAxiosError(err, "Couldn't submit your documents. Check your network and try again.");
  }
}
