import apiClient from './apiClient';
import { throwFromAxiosError } from './apiErrors';
import type {
  CreateGroupPayload,
  GalleryImage,
  Group,
  GroupDetail,
  GroupJoinRequest,
  GroupSchedule,
  JoinGroupResult,
  ListGroupGalleryQuery,
  ListGroupGalleryResult,
  ListGroupMembersQuery,
  ListGroupMembersResult,
  ListGroupsQuery,
  ListGroupsResult,
  ListMineGroupsQuery,
  ListMineGroupsResult,
  ListMyGroupJoinRequestsQuery,
  ListMyGroupJoinRequestsResult,
  UpdateGroupPayload,
} from '@/types/group';

// REAL — wired to spot-backend's groups domain (see spot-backend/CLAUDE.md
// "Groups (hội)" + docs/API.md §8). Mirrors matchService.ts's pattern
// exactly (apiClient for the 401→refresh→retry interceptor chain,
// throwFromAxiosError for consistent error surfacing, explicit
// response-envelope unwrapping — never a blind `res.data as X` cast, see
// matchService.ts's own header comment for the bug class that caused).

/** GET /groups — Groups sub-tab browse (Homepage). */
export async function listGroups(query: ListGroupsQuery = {}): Promise<ListGroupsResult> {
  try {
    const res = await apiClient.get('/groups', { params: query });
    return {
      groups: res.data.groups as Group[],
      total: res.data.total as number,
      limit: res.data.limit as number,
      offset: res.data.offset as number,
      suggestions: res.data.suggestions,
    };
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load groups. Check your network and try again.");
  }
}

/** GET /groups/mine — Manage Groups screen. tab=managed|joined, section=groups|pending-requests|join-requests. */
export async function listMyGroups(query: ListMineGroupsQuery = {}): Promise<ListMineGroupsResult> {
  try {
    const res = await apiClient.get('/groups/mine', { params: query });
    return {
      tab: res.data.tab,
      section: res.data.section,
      total: res.data.total,
      limit: res.data.limit,
      offset: res.data.offset,
      groups: res.data.groups,
      requests: res.data.requests,
    };
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load your groups. Check your network and try again.");
  }
}

/** GET /groups/my-join-requests — Manage Groups "My Join Requests" section (joiner's own PENDING + REJECTED). */
export async function listMyGroupJoinRequests(
  query: ListMyGroupJoinRequestsQuery = {}
): Promise<ListMyGroupJoinRequestsResult> {
  try {
    const res = await apiClient.get('/groups/my-join-requests', { params: query });
    return {
      requests: res.data.requests,
      total: res.data.total,
      pendingCount: res.data.pendingCount,
      limit: res.data.limit,
      offset: res.data.offset,
    };
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load your join requests. Check your network and try again.");
  }
}

/** GET /groups/:id — Group Detail, About tab + shared fetch backing the other 3 tabs. */
export async function getGroupDetail(groupId: number): Promise<GroupDetail> {
  try {
    const res = await apiClient.get(`/groups/${groupId}`);
    return res.data.group as GroupDetail;
  } catch (err) {
    throwFromAxiosError(err, 'Group not found.');
  }
}

/** POST /groups — Create Group form submit. Caller becomes ADMIN. */
export async function createGroup(payload: CreateGroupPayload): Promise<Group> {
  try {
    const res = await apiClient.post<{ group: Group }>('/groups', payload);
    return res.data.group;
  } catch (err) {
    throwFromAxiosError(err, "Couldn't create your group. Check your network and try again.");
  }
}

/** PATCH /groups/:id — Edit Group form submit / admin single-field edits (e.g. joinMode flush). Admin-only; 400 if body is empty. */
export async function updateGroup(groupId: number, payload: UpdateGroupPayload): Promise<Group> {
  try {
    const res = await apiClient.patch<{ group: Group }>(`/groups/${groupId}`, payload);
    return res.data.group;
  } catch (err) {
    throwFromAxiosError(err, "Couldn't save your changes. Check your network and try again.");
  }
}

/** DELETE /groups/:id — "Disband Group" in ManageGroupRequestsScreen. Admin-only. */
export async function deleteGroup(groupId: number): Promise<void> {
  try {
    await apiClient.delete(`/groups/${groupId}`);
  } catch (err) {
    throwFromAxiosError(err, "Couldn't disband this group. Check your network and try again.");
  }
}

/**
 * POST /groups/:id/join — Group Detail action bar "Join". Skill gate is
 * HARD here (400, no request row created) — unlike Matches' join, which
 * only warns and still lets the join through. No skillWarning field on
 * the response for that reason.
 */
export async function joinGroup(groupId: number, message?: string): Promise<JoinGroupResult> {
  try {
    const res = await apiClient.post<JoinGroupResult>(`/groups/${groupId}/join`, message ? { message } : {});
    return { request: res.data.request, group: res.data.group };
  } catch (err) {
    throwFromAxiosError(err, "Couldn't send your request. Check your network and try again.");
  }
}

/** DELETE /groups/:id/join — cancel own PENDING join request. */
export async function cancelGroupJoinRequest(groupId: number): Promise<void> {
  try {
    await apiClient.delete(`/groups/${groupId}/join`);
  } catch (err) {
    throwFromAxiosError(err, "Couldn't cancel your request. Check your network and try again.");
  }
}

/** POST /groups/:id/leave — non-admin member leaves. Admin must transfer-admin first (400 otherwise). */
export async function leaveGroup(groupId: number): Promise<void> {
  try {
    await apiClient.post(`/groups/${groupId}/leave`);
  } catch (err) {
    throwFromAxiosError(err, "Couldn't leave this group. Check your network and try again.");
  }
}

/** GET /groups/:id/requests — ManageGroupsScreen's "Pending Requests" section is aggregated via listMyGroups instead; this is the single-group admin-only list, PENDING only. */
export async function listGroupJoinRequests(groupId: number): Promise<GroupJoinRequest[]> {
  try {
    const res = await apiClient.get(`/groups/${groupId}/requests`);
    return res.data.requests as GroupJoinRequest[];
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load join requests. Check your network and try again.");
  }
}

/** POST /groups/:id/requests/:requestId/accept — ManageGroupsScreen "Pending Requests" Approve. Admin-only. */
export async function acceptGroupJoinRequest(groupId: number, requestId: number): Promise<void> {
  try {
    await apiClient.post(`/groups/${groupId}/requests/${requestId}/accept`);
  } catch (err) {
    throwFromAxiosError(err, "Couldn't approve this request. Check your network and try again.");
  }
}

/** POST /groups/:id/requests/:requestId/reject — ManageGroupsScreen "Pending Requests" Decline. Admin-only. Not terminal — the user may reapply. */
export async function rejectGroupJoinRequest(groupId: number, requestId: number): Promise<void> {
  try {
    await apiClient.post(`/groups/${groupId}/requests/${requestId}/reject`);
  } catch (err) {
    throwFromAxiosError(err, "Couldn't decline this request. Check your network and try again.");
  }
}

/** POST /groups/:id/members/:userId/kick — ManageGroupRequestsScreen "Kick". Admin-only; terminal (kicked user gets 403 on any future rejoin). */
export async function kickGroupMember(groupId: number, userId: number): Promise<void> {
  try {
    await apiClient.post(`/groups/${groupId}/members/${userId}/kick`);
  } catch (err) {
    throwFromAxiosError(err, "Couldn't remove this member. Check your network and try again.");
  }
}

/** POST /groups/:id/members/:userId/transfer-admin — ManageGroupRequestsScreen "Make Admin". Admin-only; target must currently be a MEMBER. */
export async function transferGroupAdmin(groupId: number, userId: number): Promise<{ adminUserId: number }> {
  try {
    const res = await apiClient.post(`/groups/${groupId}/members/${userId}/transfer-admin`);
    return { adminUserId: res.data.adminUserId };
  } catch (err) {
    throwFromAxiosError(err, "Couldn't transfer admin. Check your network and try again.");
  }
}

/** POST/DELETE /groups/:id/favorite — heart icon on card/detail. */
export async function setGroupFavorite(groupId: number, favorited: boolean): Promise<{ isFavorited: boolean }> {
  try {
    if (favorited) {
      await apiClient.post(`/groups/${groupId}/favorite`);
    } else {
      await apiClient.delete(`/groups/${groupId}/favorite`);
    }
    return { isFavorited: favorited };
  } catch (err) {
    throwFromAxiosError(err, "Couldn't update favorite. Check your network and try again.");
  }
}

/** GET /groups/:id/members?search=&limit=&offset= — Group Detail Members tab (read-only for everyone, including admin). */
export async function listGroupMembers(
  groupId: number,
  query: ListGroupMembersQuery = {}
): Promise<ListGroupMembersResult> {
  try {
    const res = await apiClient.get(`/groups/${groupId}/members`, { params: query });
    return {
      groupId: res.data.groupId,
      members: res.data.members,
      total: res.data.total,
      limit: res.data.limit,
      offset: res.data.offset,
    };
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load members. Check your network and try again.");
  }
}

/** GET /groups/:id/schedule?date=YYYY-MM-DD — Group Detail Schedule tab. date is required; visualization only, no real bookings. */
export async function getGroupSchedule(groupId: number, date: string): Promise<GroupSchedule> {
  try {
    const res = await apiClient.get(`/groups/${groupId}/schedule`, { params: { date } });
    return res.data as GroupSchedule;
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load the schedule. Check your network and try again.");
  }
}

/** GET /groups/:id/gallery?limit=&offset= — Group Detail Gallery tab. */
export async function listGroupGallery(
  groupId: number,
  query: ListGroupGalleryQuery = {}
): Promise<ListGroupGalleryResult> {
  try {
    const res = await apiClient.get(`/groups/${groupId}/gallery`, { params: query });
    return {
      groupId: res.data.groupId,
      images: res.data.images,
      total: res.data.total,
      limit: res.data.limit,
      offset: res.data.offset,
    };
  } catch (err) {
    throwFromAxiosError(err, "Couldn't load the gallery. Check your network and try again.");
  }
}

/**
 * POST /groups/:id/gallery — admin-only "Add Photo". Body is a pasted
 * http(s) URL, max 2048 chars, max 50 images/group (400 over that) — no
 * Supabase Storage/expo-image-picker upload pipeline exists in this app
 * yet, same convention as HostMatchScreen's coverUrl field.
 */
export async function addGroupGalleryImage(groupId: number, imageUrl: string): Promise<GalleryImage> {
  try {
    const res = await apiClient.post<{ image: GalleryImage }>(`/groups/${groupId}/gallery`, { imageUrl });
    return res.data.image;
  } catch (err) {
    throwFromAxiosError(err, "Couldn't add this photo. Check your network and try again.");
  }
}

/** DELETE /groups/:id/gallery/:imageId — admin-only per-image delete. */
export async function deleteGroupGalleryImage(groupId: number, imageId: number): Promise<void> {
  try {
    await apiClient.delete(`/groups/${groupId}/gallery/${imageId}`);
  } catch (err) {
    throwFromAxiosError(err, "Couldn't remove this photo. Check your network and try again.");
  }
}

// getVnAdminTree() (GET /geo/vn) is intentionally NOT duplicated here —
// import it straight from '@/services/matchService', it's sport/domain-
// agnostic VN admin-unit data already cached module-level there.
