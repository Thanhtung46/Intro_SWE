// Shapes mirror spot-backend/src/domains/matchmaking (entity/match.entity.js,
// dto/{list-matches,list-mine,join-match,create-match}.dto.js) and
// spot-backend/src/domains/auth (entity/user.entity.js toPublicHostProfile) —
// re-check those files before changing field names, see SPOT-76 plan.

import type { JoinMatchFormValues, JoinMatchGuestFormValues } from '@/schemas/joinMatchSchema';

export type Sport = 'BADMINTON' | 'FOOTBALL';

export type MatchFormat = 'SINGLES' | 'DOUBLES' | 'FIVE_A_SIDE' | 'SEVEN_A_SIDE' | 'ELEVEN_A_SIDE';

export type FeeType = 'GENDER_RANGE' | 'SPLIT_EVENLY';

export type JoinMode = 'AUTO' | 'APPROVAL';

export type MatchStatus = 'OPEN' | 'FULL' | 'COMPLETED' | 'CANCELLED';

export type MineTab = 'active' | 'completed' | 'joinRequests'; // display label "Requests" on the Manage Matches tab bar

// GENDER_RANGE fee split only — not the user's profile gender.
export type FeeGender = 'female' | 'male';

export type JoinRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'KICKED';

export type MatchCourt = {
  courtId: number;
  name: string | null;
  sortOrder: number;
};

export type HostSummary = {
  userId: number;
  fullName?: string;
  avatarUrl: string | null;
  matchCount: number;
  rating: null; // always null until the Review domain ships
};

// Public match card — same shape for GET /matches (list), GET /matches/mine,
// and the `match` field on GET /matches/:id.
export type Match = {
  matchId: number;
  hostUserId: number;
  hostFullName?: string;
  host: HostSummary;
  hostPhoneNumber?: string | null; // only present when caller is host/accepted
  // GET /matches/mine only — never set on Homepage's plain GET /matches.
  myRole?: 'HOST' | 'PARTICIPANT';
  pendingRequestCount?: number;
  coverUrl: string | null;
  isFavorited: boolean;
  participantAvatars: string[]; // max 3, list/card preview only
  sport: Sport;
  format: MatchFormat;
  title: string;
  notes: string | null;
  venueName: string;
  venueAddress: string;
  latitude: number | null;
  longitude: number | null;
  startsAt: string;
  endsAt: string;
  isMultiDay: boolean;
  isRecurring: boolean;
  maxPlayers: number;
  filledCount: number;
  spotsLeft: number;
  squad: { filled: number; max: number };
  skillMin: string | null;
  skillMax: string | null;
  allLevels: boolean;
  feeType: FeeType;
  priceMin: number | null; // VND
  priceMax: number | null; // VND
  yourShare: number | null; // VND — SPLIT_EVENLY: ceil(priceMin/maxPlayers); GENDER_RANGE: by viewer gender
  joinMode: JoinMode;
  status: MatchStatus;
  courtCount: number;
  courts: MatchCourt[];
  createdAt: string;
};

export type Guest = {
  guestId: number;
  name: string;
  skill: string;
  gender: FeeGender;
  phoneNumber?: string | null; // only when caller may see phones for this request
};

export type JoinRequest = {
  requestId: number;
  matchId: number;
  userId: number;
  fullName?: string;
  avatarUrl?: string | null;
  gender?: string;
  skill?: string | null;
  message: string | null;
  status: JoinRequestStatus;
  skillWarning: boolean;
  heads: number;
  shareAmount: number | null;
  paymentStatus: 'SUCCESS' | null;
  guests: Guest[];
  createdAt: string;
  phoneNumber?: string | null;
};

export type Participant = {
  userId: number;
  fullName?: string;
  avatarUrl: string | null;
  role: 'HOST' | 'PLAYER';
  gender?: string;
  skill?: string | null;
  shareAmount?: number | null; // PLAYER only
  paymentStatus?: 'SUCCESS' | null; // PLAYER only
  requestId?: number;
  heads: number;
  phoneNumber?: string | null; // only when caller is host or this participant
  guests: Guest[];
};

// GET /matches/:id
export type MatchDetail = {
  match: Match;
  canJoin: boolean;
  isHost?: boolean;
  yourRequest: JoinRequest | null;
  participants: Participant[];
};

// GET /matches query params (Filter sheet + Homepage search/skill chips).
export type ListMatchesQuery = {
  sport?: Sport;
  date?: string; // YYYY-MM-DD
  timeFrom?: string; // HH:mm
  timeTo?: string; // HH:mm
  skill?: string[]; // skill codes for `sport`, max 10
  format?: MatchFormat[]; // SINGLES/DOUBLES or FIVE_A_SIDE/… for `sport`
  priceMin?: number; // VND
  priceMax?: number; // VND
  location?: string; // substring match on venueName OR venueAddress — not geocoded
  province?: string; // VN admin-unit code (pre-2025), see @/types/geo — requires city's parent, mutually additive with location
  city?: string; // VN admin-unit code (pre-2025) — requires province
  latitude?: number;
  longitude?: number;
  radiusKm?: number; // 1-20, requires latitude+longitude too
  favorited?: boolean;
  hostUserId?: number;
  limit?: number; // default 20, max 50
  offset?: number;
};

// Homepage search-as-you-type dropdown, returned on GET /matches when
// `location` is present (see spot-backend/CLAUDE.md "Homepage search").
export type MatchSuggestionKind = 'title' | 'venueName' | 'venueAddress';
export type MatchSuggestion = { text: string; kind: MatchSuggestionKind };

export type ListMatchesResult = {
  matches: Match[];
  total: number;
  suggestions?: MatchSuggestion[]; // present only when `location` was sent
};

// GET /matches/mine
export type ListMineQuery = {
  tab?: MineTab; // default 'active'
  limit?: number;
  offset?: number;
};

// GET /matches/my-join-requests — Manage Matches "Requests" tab (joiner's
// own PENDING + REJECTED requests). Different shape from Match: a request
// row wrapping a small match summary, not a full match card.
export type MyJoinRequestMatchSummary = {
  matchId: number;
  title: string;
  sport: Sport;
  joinMode: JoinMode;
  startsAt: string;
  endsAt: string;
  venueName: string;
  venueAddress: string;
  status: MatchStatus;
  hostFullName?: string;
  hostAvatarUrl?: string | null;
};

export type MyJoinRequest = {
  requestId: number;
  status: JoinRequestStatus; // PENDING | REJECTED here
  message: string | null;
  heads: number;
  skillWarning: boolean;
  shareAmount: number | null;
  paymentStatus: 'SUCCESS' | null;
  createdAt: string;
  updatedAt: string;
  match: MyJoinRequestMatchSummary;
};

export type ListMyJoinRequestsResult = {
  requests: MyJoinRequest[];
  total: number;
  pendingCount: number;
};

// POST /matches/:id/join — re-exports of src/schemas/joinMatchSchema.ts's
// inferred type, per .claude/rules/form-conventions.md's "schema is the
// single source of truth" rule (don't hand-duplicate the payload shape).
export type GuestInput = JoinMatchGuestFormValues;
export type JoinMatchPayload = JoinMatchFormValues;

// POST /matches — "Host a Match" (FAB > Matches tab), out of the original
// 6-screen scope but the API is already Done, see SPOT-76 plan mục 4.
// province/city are required by createMatchSchema (spot-backend) — this
// type used to omit them, which would have 400'd every real submit.
export type CreateMatchPayload = {
  sport: Sport;
  format: MatchFormat;
  title: string;
  notes?: string | null;
  coverUrl?: string | null;
  venueName: string;
  venueAddress: string;
  province: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  startsAt: string;
  endsAt: string;
  isMultiDay?: boolean;
  isRecurring?: boolean;
  maxPlayers: number;
  allLevels?: boolean;
  skillMin?: string;
  skillMax?: string;
  feeType: FeeType;
  priceMin?: number;
  priceMax?: number;
  joinMode: JoinMode;
  courtCount?: number;
  courts: { name: string }[];
};

// POST /matches/bulk — Vmito-style recurring publish. `template` omits the
// schedule fields (startsAt/endsAt), which live per-entry in `schedules`.
export type CreateMatchBulkPayload = {
  template: Omit<CreateMatchPayload, 'startsAt' | 'endsAt'>;
  schedules: { startsAt: string; endsAt: string }[];
};

// GET /matches/venue-suggestions — Host form location picker (wider pool
// than Homepage browse, see spot-backend/CLAUDE.md "Host form 99:2").
export type VenueSuggestion = {
  venueName: string;
  venueAddress: string;
  province: string | null;
  provinceName: string | null;
  city: string | null;
  cityName: string | null;
  latitude: number | null;
  longitude: number | null;
};

// GET /users/:id — Check Profile screen. No email/phone/gender on this
// endpoint by design (spot-backend/CLAUDE.md). rating/reviewCount are now
// live from schema_review.match_host_reviews (Aug 2026 P3 batch) — null/0
// until the host's first review, not "always null" as this used to say.
export type HostProfile = {
  userId: number;
  fullName: string;
  avatarUrl: string | null;
  createdAt: string;
  skills: Record<string, string | null>; // { badminton: code|null, football: code|null }
  matchCount: number;
  joinedMatches: number;
  rating: number | null;
  reviewCount: number;
};

// GET /reviews/hosts/:userId/reviews — Check Profile's Reviews section.
export type HostReview = {
  reviewId: number;
  rating: number;
  reviewText: string | null;
  createdAt: string;
  reviewer: { userId: number; fullName?: string; avatarUrl: string | null };
  match: { matchId: number; title: string; sport: Sport };
};

export type HostReviewsResult = {
  hostUserId: number;
  hostRating: { reviewCount: number; avgRating: number | null };
  total: number;
  limit: number;
  offset: number;
  reviews: HostReview[];
};
