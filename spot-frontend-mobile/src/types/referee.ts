// Referee (trọng tài) domain types — transcribed from spot-backend's
// /referee/* contract (spot-backend/docs/API.md §19 +
// src/domains/referee/entity/referee.entity.js, which is authoritative for
// field names). All endpoints require Bearer + role REFEREE + status ACTIVE.

export type RefereeSport = 'Football' | 'Badminton';

export type AssignmentStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'COMPLETED';

export type DocumentKind = 'ID_FRONT' | 'ID_BACK' | 'VFF_LICENSE' | 'CERT_UPDATE';

export type CertStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** GET /referee/me → { profile } */
export interface RefereeProfile {
  userId: number;
  fullName: string;
  avatarUrl: string | null;
  certifiedSportTypes: RefereeSport[];
  totalMatchesOfficiated: number;
  avgRating: number;
  ratingCount: number;
  /** Server-side one-time flag: false on the first login → show "Account Activated". */
  activationAcknowledged: boolean;
  createdAt: string;
  updatedAt: string;
}

/** GET /referee/me/certifications → { certifications } */
export interface RefereeCertification {
  verificationReqId: number;
  documentKind: DocumentKind | null;
  documentUrl: string;
  status: CertStatus;
  adminNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

/** GET /referee/board venue row */
export interface BoardVenue {
  venueId: number;
  name: string;
  address: string | null;
  province: string | null;
  city: string | null;
  provinceName: string | null;
  cityName: string | null;
  latitude?: number;
  longitude?: number;
  ownerName: string | null;
  sportType: RefereeSport;
  avgRating: number;
  ratingCount: number;
  distanceKm?: number;
  isFavorited: boolean;
}

export interface BoardResult {
  sport: RefereeSport;
  page: number;
  limit: number;
  venues: BoardVenue[];
}

/** Query params the board screen sends (service maps filters → these). */
export interface BoardQuery {
  sport: string;
  q?: string;
  page?: number;
  limit?: number;
  // Location XOR distance — never both.
  province?: string;
  city?: string;
  favorited?: boolean;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

/** POST/DELETE /referee/venues/:id/register → { registration } (also the
 *  `myVenues[]` item shape on the pending payload). */
export interface VenueRegistration {
  registrationId: number;
  venueId: number;
  venueName: string;
  venueAddress: string | null;
  ownerName: string | null;
  sportType: RefereeSport;
  status: 'ACTIVE' | 'CANCELLED';
  registeredAt: string;
}

/** matchInvitations[] / confirmed+completed assignments[] item. */
export interface MatchInvitation {
  assignmentId: number;
  bookingId: number;
  venueId: number;
  venueName: string;
  playerName: string | null;
  sportType: RefereeSport;
  startsAt: string;
  endsAt: string | null;
  feeVnd: number;
  status: AssignmentStatus;
}

export interface PendingInvitationsPayload {
  tab: 'pending';
  matchInvitations: MatchInvitation[];
  myVenues: VenueRegistration[];
}

export interface AssignmentListPayload {
  tab: 'confirmed' | 'completed';
  since?: string;
  filter?: 'all' | 'completed' | 'declined';
  assignments: MatchInvitation[];
}

/** GET /referee/assignments/:id → { assignment } */
export interface AssignmentDetail {
  assignmentId: number;
  bookingId: number;
  venueId: number;
  venueName: string;
  venueAddress: string | null;
  playerName: string | null;
  ownerName: string | null;
  sportType: RefereeSport;
  startsAt: string;
  endsAt: string | null;
  feeVnd: number;
  status: AssignmentStatus;
  source: 'HIRE_REFEREE';
  acceptedAt: string | null;
  completedAt: string | null;
  declineReason: string | null;
  createdAt: string;
}

/** GET /referee/schedule?month=YYYY-MM */
export interface ScheduleItem {
  assignmentId: number;
  bookingId: number;
  venueId: number;
  venueName: string;
  sportType: RefereeSport;
  playerName: string | null;
  bookingDate: string;
  startsAt: string;
  endsAt: string | null;
  feeVnd: number;
  status: 'ACCEPTED';
  isUpcoming: boolean;
}

export interface ScheduleResponse {
  month: string;
  timezone: string;
  confirmedDates: string[];
  items: ScheduleItem[];
}

/** GET /referee/earnings?month=YYYY-MM */
export interface ChartPoint {
  day: string;
  amountVnd: number;
}

export interface EarningsResponse {
  month: string;
  currency: 'VND';
  totalFeeVnd: number;
  matchCount: number;
  chartPoints: ChartPoint[];
}

/** GET /referee/earnings/monthly?anchor=YYYY-MM&months=N */
export interface EarningsBucket {
  key: string; // "YYYY-MM"
  amountVnd: number;
  matchCount: number;
}

export interface EarningsMonthlyResponse {
  anchor: string;
  months: number;
  currency: 'VND';
  buckets: EarningsBucket[];
}

/** GET /referee/earnings/history */
export interface EarningsHistoryItem {
  index: number;
  assignmentId: number;
  bookingId: number;
  venueName: string;
  sportType: RefereeSport;
  playerName: string | null;
  startsAt: string;
  feeVnd: number;
  completedAt: string;
}

export interface EarningsHistoryResponse {
  items: EarningsHistoryItem[];
  total: number;
  limit: number;
  offset: number;
  month: string | null;
}

/** POST /users/me/verification-requests/batch document entry. */
export interface VerificationDocumentInput {
  documentKind: Exclude<DocumentKind, 'CERT_UPDATE'>;
  documentUrl: string;
}
