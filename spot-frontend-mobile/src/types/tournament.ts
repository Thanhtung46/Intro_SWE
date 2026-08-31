// Shapes mirror spot-backend/src/domains/tournaments
// (entity/tournament.entity.js — toPublicTournament / toPublicJoinRequest /
// toPublicMyJoinRequest / toPublicTeam / toPublicMatch — and
// dto/{create-tournament,update-tournament,list-tournaments,list-mine,
// my-join-requests,join-tournament,create-tournament-match,
// update-tournament-match,tournament-match-result,standings-query,
// complete-tournament}.dto.js). Re-check those files before renaming a field.
// Full contract: spot-backend/docs/API.md §9 + spot-backend/docs/TOURNAMENT_PLAN.md.
// Tournament FE implementation plan (2026-08-29 session) has the FE-side
// resolved decisions this file assumes.

import type { Sport } from '@/types/match';

export type TournamentStatus =
  | 'OPEN_REGISTRATION'
  | 'FULL'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED';

// One tournament = one format (immutable after create). Football formats carry a
// separate genderDivision; badminton formats encode gender in the code itself.
export type FootballFormat = 'FIVE_A_SIDE' | 'SEVEN_A_SIDE' | 'ELEVEN_A_SIDE';
export type BadmintonFormat = 'MS' | 'WS' | 'MD' | 'WD' | 'MIXED';
export type TournamentFormat = FootballFormat | BadmintonFormat;

export type GenderDivision = 'MEN' | 'WOMEN';

export type TournamentRound =
  | 'GROUP_STAGE'
  | 'ROUND_OF_32'
  | 'ROUND_OF_16'
  | 'QUARTER_FINAL'
  | 'SEMI_FINAL'
  | 'THIRD_PLACE'
  | 'FINAL';

export type TournamentRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'KICKED';

export type TournamentMineTab = 'hosted' | 'joined';
export type TournamentMineSection = 'tournaments' | 'pending-requests' | 'join-requests';

export type TournamentOrganizer = {
  userId: number;
  fullName?: string;
  avatarUrl: string | null;
};

// `myJoinRequest` on a tournament view is only the bare status (loadTournamentView).
export type TournamentMyJoinRequest = { status: TournamentRequestStatus };

export type TournamentWinner = {
  place: number;
  teamId: number;
  teamName?: string;
  teamLogoUrl?: string | null;
};

// Public tournament card — GET /tournaments (list), GET /tournaments/mine, and
// the `tournament` field on GET /tournaments/:id (+ description/winners there).
export type Tournament = {
  tournamentId: number;
  sport: Sport;
  format: TournamentFormat;
  genderDivision: GenderDivision | null;
  formatBadge: string; // server-computed, e.g. "5v5 Women's" / "Men's Doubles" — render verbatim
  title: string;
  coverUrl: string | null;
  venueName: string;
  venueAddress: string;
  province: string | null;
  provinceName: string | null;
  city: string | null;
  cityName: string | null;
  latitude: number;
  longitude: number;
  startsAt: string;
  endsAt: string;
  registrationDeadline: string;
  maxTeams: number;
  acceptedTeamCount: number;
  registrationFeeVnd: number;
  prizePoolVnd: number;
  status: TournamentStatus;
  hostedByLabel: string; // always "SPOT"
  isFavorited: boolean;
  isOrganizer?: boolean;
  myJoinRequest?: TournamentMyJoinRequest;
  canJoin: boolean;
  teamLogos: string[]; // max 3, preview
  organizer: TournamentOrganizer;
  createdAt: string;
  // present only on GET /tournaments/:id
  description?: string;
  winners?: TournamentWinner[] | null;
  // present only on GET /tournaments/mine?tab=hosted&section=tournaments when organizer
  pendingRequestCount?: number;
};

// GET /tournaments/:id
export type TournamentDetail = Tournament & {
  description: string;
  winners: TournamentWinner[] | null;
};

export type RosterPlayer = {
  rosterPlayerId: number;
  name: string;
  jerseyNumber: number | null;
  rank: number | null;
};

export type TournamentTeam = {
  teamId: number;
  teamName: string;
  teamLogoUrl: string | null;
  captainUserId: number;
  captainFullName?: string;
  captainAvatarUrl: string | null;
  roster: RosterPlayer[];
  createdAt: string;
};

// GET /tournaments/:id/requests — organizer PENDING list.
export type TournamentJoinRequest = {
  requestId: number;
  tournamentId: number;
  captainUserId: number;
  teamName: string;
  teamLogoUrl: string;
  roster: RosterInput[];
  status: TournamentRequestStatus;
  captain: {
    userId: number;
    fullName?: string;
    avatarUrl: string | null;
    phoneNumber?: string;
  };
  createdAt: string;
  updatedAt: string;
};

// GET /tournaments/my-join-requests — captain's own PENDING + REJECTED.
export type MyTournamentJoinRequestSummary = {
  tournamentId: number;
  title: string;
  sport: Sport;
  format: TournamentFormat;
  genderDivision: GenderDivision | null;
  formatBadge: string;
  status: TournamentStatus;
  venueName: string;
  venueAddress: string;
  coverUrl: string | null;
  organizerFullName?: string;
  organizerAvatarUrl: string | null;
};

export type MyTournamentJoinRequest = {
  requestId: number;
  status: 'PENDING' | 'REJECTED';
  teamName: string;
  teamLogoUrl: string;
  createdAt: string;
  updatedAt: string;
  tournament: MyTournamentJoinRequestSummary;
};

export type TournamentMatchResultStatus = 'SCHEDULED' | 'COMPLETED';

export type FootballMatchResult = {
  type: 'FOOTBALL';
  teamAGoals: number;
  teamBGoals: number;
  outcome: 'WIN' | 'DRAW';
  winnerTeamId: number | null;
};

export type BadmintonMatchResult = {
  type: 'BADMINTON';
  sets: { teamAPoints: number; teamBPoints: number }[];
  winnerTeamId: number | null;
};

export type TournamentMatchTeam = {
  teamId: number;
  teamName: string;
  teamLogoUrl: string | null;
};

export type TournamentMatch = {
  matchId: number;
  tournamentId: number;
  round: TournamentRound;
  scheduledAt: string;
  resultStatus: TournamentMatchResultStatus;
  result: FootballMatchResult | BadmintonMatchResult | null;
  teamA: TournamentMatchTeam;
  teamB: TournamentMatchTeam;
  createdAt: string;
  updatedAt: string;
};

// GET /tournaments/:id/standings
export type StandingRow = {
  rank: number;
  teamId: number;
  teamName: string;
  teamLogoUrl: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  pts: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  setsWon: number;
  setsLost: number;
  setDifference: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifference: number;
};

// ---- query params ----

export type ListTournamentsQuery = {
  sport?: Sport;
  location?: string; // XOR with latitude/longitude/radiusKm
  province?: string; // pre-2025 code, <=5 chars; `city` requires it
  city?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number; // 1-20, all three together
  favorited?: boolean;
  limit?: number;
  offset?: number;
};

export type TournamentSuggestion = { text: string; kind: string };

export type ListTournamentsResult = {
  total: number;
  limit: number;
  offset: number;
  suggestions?: TournamentSuggestion[];
  tournaments: Tournament[];
};

export type ListMyTournamentsQuery = {
  tab?: TournamentMineTab; // default 'hosted'
  section?: TournamentMineSection; // default 'tournaments'
  limit?: number;
  offset?: number;
};

// `tournaments` present for section='tournaments'; `requests` for
// 'pending-requests' (TournamentJoinRequest[]) / 'join-requests'
// (MyTournamentJoinRequest[]). `pendingCount` only on the join-requests shape.
export type ListMyTournamentsResult = {
  total: number;
  limit: number;
  offset: number;
  pendingCount?: number;
  tournaments?: Tournament[];
  requests?: TournamentJoinRequest[] | MyTournamentJoinRequest[];
};

export type ListMyTournamentJoinRequestsQuery = {
  status?: 'PENDING' | 'REJECTED';
  limit?: number;
  offset?: number;
};

export type ListMyTournamentJoinRequestsResult = {
  total: number;
  pendingCount: number;
  limit: number;
  offset: number;
  requests: MyTournamentJoinRequest[];
};

export type ListTournamentRequestsResult = { requests: TournamentJoinRequest[] };

export type ListTournamentPlayersResult = {
  tournamentId: number;
  teams: TournamentTeam[];
};

export type ListTournamentMatchesResult = { matches: TournamentMatch[] };

export type TournamentStandingsQuery = { round?: TournamentRound };

export type TournamentStandingsResult = {
  tournamentId: number;
  sport: Sport;
  round: TournamentRound | null;
  standings: StandingRow[];
};

// ---- payloads ----

// POST /tournaments — mirrors create-tournament.dto.js. coverUrl, description,
// latitude, longitude are ALL required (not optional). province/city are
// pre-2025 codes, <=5 chars.
export type CreateTournamentPayload = {
  sport: Sport;
  format: TournamentFormat;
  genderDivision?: GenderDivision | null; // required iff sport === 'FOOTBALL'
  title: string;
  coverUrl: string;
  description: string;
  venueName: string;
  venueAddress: string;
  province: string;
  city: string;
  latitude: number;
  longitude: number;
  startsAt: string; // ISO-8601 with offset
  endsAt: string;
  registrationDeadline: string;
  maxTeams: number; // 2-128
  registrationFeeVnd: number; // int >= 0
  prizePoolVnd: number;
};

// PATCH /tournaments/:id — partial; backend 400s on empty body. sport/format/
// genderDivision/maxTeams are NOT patchable (product lock). venue*/schedule
// fields 400 after ACTIVE.
export type UpdateTournamentPayload = Partial<
  Omit<CreateTournamentPayload, 'sport' | 'format' | 'genderDivision' | 'maxTeams'>
> & {
  winners?: { place: number; teamId: number }[] | null;
  playerRanks?: { rosterPlayerId: number; rank: number | null }[];
};

export type FootballRosterInput = { name: string; jerseyNumber: number };
export type BadmintonRosterInput = { name: string };
export type RosterInput = FootballRosterInput | BadmintonRosterInput;

// POST /tournaments/:id/join — captain only, always PENDING.
export type JoinTournamentPayload = {
  teamName: string;
  teamLogoUrl: string;
  roster: RosterInput[];
};

export type JoinTournamentResult = {
  message: string;
  request: TournamentJoinRequest;
  tournament: TournamentDetail;
};

// POST /tournaments/:id/matches
export type CreateTournamentMatchPayload = {
  round: TournamentRound;
  teamAId: number;
  teamBId: number;
  scheduledAt: string;
};

export type UpdateTournamentMatchPayload = Partial<CreateTournamentMatchPayload>;

export type FootballResultPayload = { teamAGoals: number; teamBGoals: number };
export type BadmintonResultPayload = {
  sets: { teamAPoints: number; teamBPoints: number }[];
};
export type MatchResultPayload = FootballResultPayload | BadmintonResultPayload;

export type CompleteTournamentPayload = {
  winners?: { place: number; teamId: number }[];
};
