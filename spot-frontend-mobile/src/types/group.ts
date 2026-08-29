// Shapes mirror spot-backend/src/domains/groups (entity/group.entity.js,
// dto/{create-group,update-group,list-groups,list-mine,my-join-requests,
// list-members,schedule-query,gallery}.dto.js) — re-check those files
// before changing field names. See spot-backend/docs/API.md §8 and
// spot-backend/docs/GROUP_PLAN.md for the full contract; the Groups
// implementation plan (2026-08-22 planning session) has the FE-side
// resolved decisions this file assumes.

import type { Sport } from '@/types/match';

export type JoinMode = 'AUTO' | 'APPROVAL';
export type GroupRole = 'ADMIN' | 'MEMBER';
export type GroupJoinRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'KICKED';
export type GroupMineTab = 'managed' | 'joined';
export type GroupMineSection = 'groups' | 'pending-requests' | 'join-requests';

export type GroupCourt = {
  courtId: number;
  name: string | null;
  sortOrder: number;
};

export type GroupAdmin = {
  userId: number;
  fullName?: string;
  avatarUrl: string | null;
};

// dayOfWeek is ISO 1(Mon)-7(Sun) — the OPPOSITE convention from
// HostMatchScreen's JS Date.getDay() (0=Sun). Convert with
// `isoDay = jsDay === 0 ? 7 : jsDay` wherever a JS Date's weekday feeds this.
export type RecurringSlot = {
  slotId: number;
  dayOfWeek: number;
  startsAt: string; // 'HH:mm'
  durationMinutes: number;
  courtName: string;
  courtId: number;
};

// Public group card — same shape for GET /groups (list), GET /groups/mine,
// and the `group` field on GET /groups/:id.
export type Group = {
  groupId: number;
  sport: Sport;
  name: string;
  title: string;
  description: string | null;
  joinMode: JoinMode;
  logoUrl: string | null;
  coverUrl: string | null;
  venueName: string;
  venueAddress: string;
  province: string | null;
  provinceName: string | null;
  city: string | null;
  cityName: string | null;
  latitude: number | null;
  longitude: number | null;
  skillMin: string | null;
  skillMax: string | null;
  allLevels: boolean;
  zaloUrl: string | null;
  memberCount: number;
  isFavorited: boolean;
  myRole: GroupRole | null;
  admin: GroupAdmin;
  memberAvatars: string[]; // max 3, list/card preview only
  courtCount: number;
  courts: GroupCourt[];
  createdAt: string;
  recurringSlots?: RecurringSlot[]; // present only on GET /groups/:id
  pendingRequestCount?: number; // present only on GET /groups/mine?tab=managed&section=groups, when myRole==='ADMIN'
};

// GET /groups/:id — same shape as Group, recurringSlots always present here.
export type GroupDetail = Group;

export type GroupMember = {
  userId: number;
  fullName?: string;
  avatarUrl: string | null;
  role: GroupRole;
  isAdmin: boolean;
  skill?: string | null;
  joinedAt: string;
};

export type GroupJoinRequest = {
  requestId: number;
  groupId: number;
  userId: number;
  fullName?: string;
  avatarUrl?: string | null;
  skill?: string | null;
  message: string | null;
  status: GroupJoinRequestStatus;
  createdAt: string;
  updatedAt: string;
};

// GET /groups/my-join-requests — Manage Groups "My Join Requests" section
// (joiner's own PENDING + REJECTED). Different shape from Group: a request
// row wrapping a small group summary, not a full group card.
export type MyGroupJoinRequestSummary = {
  groupId: number;
  name: string;
  title: string;
  sport: Sport;
  joinMode: JoinMode;
  venueName: string;
  venueAddress: string;
  adminFullName?: string;
  adminAvatarUrl: string | null;
};

export type MyGroupJoinRequest = {
  requestId: number;
  status: 'PENDING' | 'REJECTED'; // this endpoint only ever returns these two
  message: string | null;
  createdAt: string;
  updatedAt: string;
  group: MyGroupJoinRequestSummary;
};

export type GalleryImage = {
  imageId: number;
  imageUrl: string;
  uploadedBy: number;
  sortOrder: number;
  createdAt: string;
};

export type ScheduleSlot = {
  startsAt: string; // 'HH:mm'
  durationMinutes: number;
  status: 'BOOKED' | 'AVAILABLE';
};

export type ScheduleCourtRow = {
  courtId: number;
  name: string | null;
  slots: ScheduleSlot[];
};

// GET /groups/:id/schedule?date=YYYY-MM-DD — visualization only, no real
// bookings; date is a required query param.
export type GroupSchedule = {
  groupId: number;
  date: string;
  dayOfWeek: number; // ISO 1-7, Asia/Bangkok-derived server-side
  courts: ScheduleCourtRow[];
};

// GET /groups query params (Filter sheet + Homepage Groups sub-tab search).
export type ListGroupsQuery = {
  sport?: Sport;
  skill?: string[]; // skill codes for `sport`, max 10 — requires sport
  location?: string; // substring match on name/venueName/venueAddress — XOR with lat/lng/radiusKm
  province?: string; // VN admin-unit code (pre-2025) — requires city's parent
  city?: string; // requires province
  latitude?: number;
  longitude?: number;
  radiusKm?: number; // 1-20, requires latitude+longitude too
  favorited?: boolean;
  limit?: number;
  offset?: number;
};

export type GroupSuggestion = { text: string; kind: string };

export type ListGroupsResult = {
  groups: Group[];
  total: number;
  limit: number;
  offset: number;
  suggestions?: GroupSuggestion[];
};

// GET /groups/mine
export type ListMineGroupsQuery = {
  tab?: GroupMineTab; // default 'managed'
  section?: GroupMineSection; // default 'groups'
  limit?: number;
  offset?: number;
};

// `groups` is present when section='groups'; `requests` when
// section='pending-requests'|'join-requests' — never both at once.
export type ListMineGroupsResult = {
  tab: GroupMineTab;
  section: GroupMineSection;
  total: number;
  limit: number;
  offset: number;
  groups?: Group[];
  requests?: GroupJoinRequest[];
};

export type ListMyGroupJoinRequestsQuery = {
  status?: 'PENDING' | 'REJECTED';
  limit?: number;
  offset?: number;
};

export type ListMyGroupJoinRequestsResult = {
  requests: MyGroupJoinRequest[];
  total: number;
  pendingCount: number;
  limit: number;
  offset: number;
};

export type ListGroupMembersQuery = {
  search?: string;
  limit?: number;
  offset?: number;
};

export type ListGroupMembersResult = {
  groupId: number;
  members: GroupMember[];
  total: number;
  limit: number;
  offset: number;
};

export type ListGroupGalleryQuery = {
  limit?: number;
  offset?: number;
};

export type ListGroupGalleryResult = {
  groupId: number;
  images: GalleryImage[];
  total: number;
  limit: number;
  offset: number;
};

// POST /groups/:id/join response — no `skillWarning` here (hard gate: a
// skill mismatch 400s before any request row is created, unlike Matches).
export type JoinGroupResult = {
  request: GroupJoinRequest;
  group: Group;
};

// POST /groups body (create-group.dto.js) — hand-written to mirror the
// backend DTO directly, same approach as match.ts's CreateMatchPayload:
// CreateGroupScreen validates raw form state with createGroupSchema first
// (local useState + .safeParse() on submit, not react-hook-form — this
// form is widget-heavy, see HostMatchScreen's identical rationale), then
// maps the parsed values into this payload shape before calling
// groupService.createGroup(). Not a direct z.infer re-export because the
// zod schema's *input* shape (raw form state) and this *wire* shape
// (what the backend DTO expects) aren't identical — e.g. skillMin/skillMax
// are derived from a multi-select skill-chip array, not typed directly.
export type CreateGroupPayload = {
  sport: Sport;
  name: string;
  title: string;
  description?: string | null;
  joinMode: JoinMode;
  venueName: string;
  venueAddress: string;
  province: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  allLevels?: boolean;
  skillMin?: string;
  skillMax?: string;
  zaloUrl?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  courts: { name: string }[];
  recurringSlots: { dayOfWeek: number; startsAt: string; durationMinutes: number; courtName: string }[];
};

// PATCH /groups/:id body (update-group.dto.js) — partial, but the backend
// 400s on a completely empty body (at least one field required), and if
// `recurringSlots` is sent, `courts` must be resent too (whole-collection
// replace) — see spot-backend/docs/API.md §8. Enforce the "at least one
// field" rule in the calling screen, not in this type.
export type UpdateGroupPayload = Partial<CreateGroupPayload>;
