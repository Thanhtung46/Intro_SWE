import pool from '../../../shared/database/pool.js';
import { AppError } from '../../../shared/middleware/errorHandler.js';
import { USER_ROLES, PG_INT4_MAX } from '../../../shared/constants/auth.js';
import { SKILLS_BY_SPORT, rankForSkill } from '../../../shared/constants/sports.js';
import {
  GROUP_MEMBER_ROLES,
  GROUP_JOIN_REQUEST_STATUSES,
  GROUP_MINE_SECTIONS,
  GROUP_MINE_TABS,
  JOIN_MODES,
  GROUP_GALLERY,
  buildScheduleMatrix,
  isoDayOfWeekBangkok,
} from '../../../shared/constants/groups.js';
import { isSkillForSport } from '../../../shared/constants/sports.js';
import { normalizeCourtName } from '../../../shared/constants/groups.js';
import * as userRepository from '../../auth/repository/user.repository.js';
import * as userSportSkillRepository from '../../auth/repository/user-sport-skill.repository.js';
import * as groupRepository from '../repository/group.repository.js';
import * as groupCourtRepository from '../repository/group-court.repository.js';
import * as groupScheduleRepository from '../repository/group-schedule.repository.js';
import * as groupMemberRepository from '../repository/group-member.repository.js';
import * as groupJoinRequestRepository from '../repository/group-join-request.repository.js';
import * as groupFavoriteRepository from '../repository/group-favorite.repository.js';
import * as groupGalleryRepository from '../repository/group-gallery.repository.js';
import * as groupNotification from './group-notification.service.js';
import { parseJoinGroupDto } from '../dto/join-group.dto.js';
import { parseUpdateGroupDto } from '../dto/update-group.dto.js';
import { parseCreateGalleryImageDto } from '../dto/gallery.dto.js';
import {
  toPublicGroup,
  toPublicJoinRequest,
  toPublicMyJoinRequest,
  toPublicMineGroup,
  toPublicMember,
  toPublicGalleryImage,
} from '../entity/group.entity.js';

function resolveSkillRange(input) {
  if (input.allLevels) {
    const ladder = SKILLS_BY_SPORT[input.sport];
    const skillMin = ladder[0].code;
    const skillMax = ladder[ladder.length - 1].code;
    return {
      skillMin,
      skillMax,
      skillMinRank: rankForSkill(input.sport, skillMin),
      skillMaxRank: rankForSkill(input.sport, skillMax),
      allLevels: true,
    };
  }
  return {
    skillMin: input.skillMin,
    skillMax: input.skillMax,
    skillMinRank: rankForSkill(input.sport, input.skillMin),
    skillMaxRank: rankForSkill(input.sport, input.skillMax),
    allLevels: false,
  };
}

function buildCourts(input) {
  return input.courts.map((court) => ({ name: court.name.trim() }));
}

function parseGroupId(raw) {
  const groupId = Number(raw);
  if (!Number.isInteger(groupId) || groupId < 1 || groupId > PG_INT4_MAX) {
    throw new AppError('Invalid group id', 400);
  }
  return groupId;
}

function callerUserId(raw) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > PG_INT4_MAX) {
    throw new AppError('Invalid user id', 400);
  }
  return value;
}

function parsePositiveInt(raw, message) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > PG_INT4_MAX) {
    throw new AppError(message, 400);
  }
  return value;
}

function isUniqueViolation(err) {
  return err?.code === '23505';
}

function skillOutOfRange(group, skillCode) {
  if (group.all_levels) {
    return false;
  }
  if (!skillCode) {
    return true;
  }
  const rank = rankForSkill(group.sport, skillCode);
  if (rank == null) {
    return true;
  }
  return (
    rank < Number(group.skill_min_rank) || rank > Number(group.skill_max_rank)
  );
}

async function loadSkillMapForSport(client, sport, userIds) {
  const uniqueIds = [...new Set(userIds.map(Number).filter(Boolean))];
  return userSportSkillRepository.findSkillsByUserIdsAndSport(
    client,
    uniqueIds,
    sport,
  );
}

function assertGroupAdmin(group, callerId) {
  if (Number(group.admin_user_id) !== callerId) {
    throw new AppError('Only the group admin can perform this action', 403);
  }
}

async function loadGroupView(client, groupRow, viewerUserId) {
  const groupId = groupRow.group_id;
  const refreshed = await groupRepository.findById(client, groupId, viewerUserId);
  const courts = await groupCourtRepository.findByGroupId(client, groupId);
  const recurringSlots = await groupScheduleRepository.findByGroupId(
    client,
    groupId,
  );
  const avatarsByGroup = await groupMemberRepository.listPreviewAvatars(
    client,
    [groupId],
  );
  return toPublicGroup(refreshed ?? groupRow, {
    courts,
    recurringSlots,
    memberAvatars: avatarsByGroup.get(groupId) || [],
    includeSchedule: true,
  });
}

async function mapMineGroups(client, rows) {
  const groupIds = rows.map((row) => row.group_id);
  const courtRows = await groupCourtRepository.findByGroupIds(client, groupIds);
  const avatarsByGroup = await groupMemberRepository.listPreviewAvatars(
    client,
    groupIds,
  );
  const courtsByGroup = new Map();
  for (const court of courtRows) {
    const list = courtsByGroup.get(court.group_id) || [];
    list.push(court);
    courtsByGroup.set(court.group_id, list);
  }
  return rows.map((row) =>
    toPublicMineGroup(row, {
      courts: courtsByGroup.get(row.group_id) || [],
      memberAvatars: avatarsByGroup.get(row.group_id) || [],
    }),
  );
}

async function assertPlayerJoiner(client, userId) {
  const user = await userRepository.findById(client, userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  if (user.role !== USER_ROLES.PLAYER) {
    throw new AppError('Only PLAYER accounts can join a group', 403);
  }
  return user;
}

async function assertPlayerCreator(client, userId) {
  const user = await userRepository.findById(client, userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  if (user.role !== USER_ROLES.PLAYER) {
    throw new AppError('Only PLAYER accounts can create a group', 403);
  }
  return user;
}

function mapSlotsToCourtIds(recurringSlots, courtRows) {
  const courtIdByName = new Map(
    courtRows.map((court) => [normalizeCourtName(court.name), court.court_id]),
  );
  return recurringSlots.map((slot) => ({
    dayOfWeek: slot.dayOfWeek,
    startsAt: slot.startsAt,
    durationMinutes: slot.durationMinutes,
    courtId: courtIdByName.get(normalizeCourtName(slot.courtName)),
  }));
}

function resolveUpdateSkillPatch(group, input) {
  const sport = input.sport ?? group.sport;
  const allLevels =
    input.allLevels !== undefined ? input.allLevels : group.all_levels;

  if (
    input.allLevels === undefined &&
    input.skillMin === undefined &&
    input.skillMax === undefined
  ) {
    return null;
  }

  if (allLevels) {
    return resolveSkillRange({ sport, allLevels: true });
  }

  const skillMin = input.skillMin ?? group.skill_min;
  const skillMax = input.skillMax ?? group.skill_max;
  if (!isSkillForSport(sport, skillMin)) {
    throw new AppError(`skillMin is not valid for ${sport}`, 400);
  }
  if (!isSkillForSport(sport, skillMax)) {
    throw new AppError(`skillMax is not valid for ${sport}`, 400);
  }
  const minRank = rankForSkill(sport, skillMin);
  const maxRank = rankForSkill(sport, skillMax);
  if (minRank != null && maxRank != null && minRank > maxRank) {
    throw new AppError('skillMax must be greater than or equal to skillMin', 400);
  }
  return resolveSkillRange({ sport, allLevels: false, skillMin, skillMax });
}

function buildUpdateFields(group, input) {
  const fields = {};
  if (input.sport !== undefined) fields.sport = input.sport;
  if (input.name !== undefined) fields.name = input.name;
  if (input.title !== undefined) fields.title = input.title;
  if (input.description !== undefined) fields.description = input.description;
  if (input.logoUrl !== undefined) fields.logoUrl = input.logoUrl;
  if (input.coverUrl !== undefined) fields.coverUrl = input.coverUrl;
  if (input.venueName !== undefined) fields.venueName = input.venueName;
  if (input.venueAddress !== undefined) fields.venueAddress = input.venueAddress;
  if (input.province !== undefined) fields.province = input.province;
  if (input.city !== undefined) fields.city = input.city;
  if (input.latitude !== undefined) fields.latitude = input.latitude;
  if (input.longitude !== undefined) fields.longitude = input.longitude;
  if (input.zaloUrl !== undefined) fields.zaloUrl = input.zaloUrl;
  if (input.joinMode !== undefined) fields.joinMode = input.joinMode;

  const skillPatch = resolveUpdateSkillPatch(group, input);
  if (skillPatch) {
    Object.assign(fields, skillPatch);
  }

  return fields;
}

async function flushPendingJoinRequests(client, group) {
  const pending = await groupJoinRequestRepository.listPendingByGroup(
    client,
    group.group_id,
  );
  if (!pending.length) {
    return 0;
  }

  let added = 0;
  for (const request of pending) {
    const existingMember = await groupMemberRepository.findMembership(
      client,
      group.group_id,
      request.user_id,
    );
    if (!existingMember) {
      await groupMemberRepository.insertMember(
        client,
        group.group_id,
        request.user_id,
      );
      added += 1;
    }
  }

  await groupJoinRequestRepository.acceptAllPending(client, group.group_id);
  if (added > 0) {
    await groupRepository.adjustMemberCount(client, group.group_id, added);
  }
  return added;
}

function formatCreatedGroup(user, groupRow, courtRows, slotRows) {
  groupRow.admin_full_name = user.full_name;
  groupRow.admin_avatar_url = user.avatar_url ?? null;
  groupRow.is_favorited = false;
  groupRow.my_role = GROUP_MEMBER_ROLES.ADMIN;
  const recurringSlots = slotRows.map((slot) => ({
    ...slot,
    court_name: courtRows.find((court) => court.court_id === slot.court_id)?.name,
  }));
  return toPublicGroup(groupRow, {
    courts: courtRows,
    recurringSlots,
    memberAvatars: user.avatar_url ? [user.avatar_url] : [],
    includeSchedule: true,
  });
}

export async function createGroup(creatorUserId, input) {
  const client = await pool.connect();
  try {
    const user = await assertPlayerCreator(client, creatorUserId);
    const skills = resolveSkillRange(input);
    const courts = buildCourts(input);

    await client.query('BEGIN');
    let groupRow;
    let courtRows;
    let slotRows;
    try {
      groupRow = await groupRepository.createGroup(client, {
        adminUserId: user.user_id,
        sport: input.sport,
        name: input.name,
        title: input.title,
        description: input.description || null,
        logoUrl: input.logoUrl ?? null,
        coverUrl: input.coverUrl ?? null,
        venueName: input.venueName,
        venueAddress: input.venueAddress,
        province: input.province,
        city: input.city,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        skillMin: skills.skillMin,
        skillMax: skills.skillMax,
        skillMinRank: skills.skillMinRank,
        skillMaxRank: skills.skillMaxRank,
        allLevels: skills.allLevels,
        joinMode: input.joinMode,
        zaloUrl: input.zaloUrl ?? null,
      });
      courtRows = await groupCourtRepository.insertCourts(
        client,
        groupRow.group_id,
        courts,
      );
      slotRows = await groupScheduleRepository.insertSlots(
        client,
        groupRow.group_id,
        mapSlotsToCourtIds(input.recurringSlots, courtRows),
      );
      await groupMemberRepository.insertAdmin(
        client,
        groupRow.group_id,
        user.user_id,
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

    return {
      message: 'Group created',
      group: formatCreatedGroup(user, groupRow, courtRows, slotRows),
    };
  } finally {
    client.release();
  }
}

export async function listGroups(userId, query) {
  const client = await pool.connect();
  try {
    const filters = {
      sport: query.sport,
      skillRanks: (query.skill || [])
        .map((code) => rankForSkill(query.sport, code))
        .filter((rank) => rank != null),
      location: query.location,
      province: query.province,
      city: query.city,
      latitude: query.latitude,
      longitude: query.longitude,
      radiusKm: query.radiusKm,
      favorited: Boolean(query.favorited),
      limit: query.limit,
      offset: query.offset,
      viewerUserId: callerUserId(userId),
    };

    const rows = await groupRepository.listGroups(client, filters);
    const total = await groupRepository.countGroups(client, filters);
    const suggestions = await groupRepository.listSearchSuggestions(
      client,
      filters,
    );

    const groupIds = rows.map((row) => row.group_id);
    const courtRows = await groupCourtRepository.findByGroupIds(client, groupIds);
    const avatarsByGroup = await groupMemberRepository.listPreviewAvatars(
      client,
      groupIds,
    );
    const courtsByGroup = new Map();
    for (const court of courtRows) {
      const list = courtsByGroup.get(court.group_id) || [];
      list.push(court);
      courtsByGroup.set(court.group_id, list);
    }

    return {
      total,
      limit: query.limit,
      offset: query.offset,
      groups: rows.map((row) =>
        toPublicGroup(row, {
          courts: courtsByGroup.get(row.group_id) || [],
          memberAvatars: avatarsByGroup.get(row.group_id) || [],
        }),
      ),
      suggestions,
    };
  } finally {
    client.release();
  }
}

export async function getGroup(userId, rawId) {
  const groupId = parseGroupId(rawId);
  const viewerUserId = callerUserId(userId);
  const client = await pool.connect();
  try {
    const row = await groupRepository.findById(client, groupId, viewerUserId);
    if (!row) {
      throw new AppError('Group not found', 404);
    }

    const courts = await groupCourtRepository.findByGroupId(client, groupId);
    const recurringSlots = await groupScheduleRepository.findByGroupId(
      client,
      groupId,
    );
    const avatarsByGroup = await groupMemberRepository.listPreviewAvatars(
      client,
      [groupId],
    );

    return {
      group: toPublicGroup(row, {
        courts,
        recurringSlots,
        memberAvatars: avatarsByGroup.get(groupId) || [],
        includeSchedule: true,
      }),
    };
  } finally {
    client.release();
  }
}

export async function joinGroup(userId, rawId, body) {
  const groupId = parseGroupId(rawId);
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const group = await groupRepository.lockById(client, groupId);
      if (!group) {
        throw new AppError('Group not found', 404);
      }

      const membership = await groupMemberRepository.findMembershipForUpdate(
        client,
        groupId,
        callerId,
      );
      if (membership) {
        throw new AppError('You are already a member of this group', 409);
      }

      await assertPlayerJoiner(client, callerId);
      const dto = parseJoinGroupDto(body);

      const skillRows = await userSportSkillRepository.findByUserId(
        client,
        callerId,
      );
      const joinerSkill = skillRows.find((row) => row.sport === group.sport)
        ?.skill_level;
      if (skillOutOfRange(group, joinerSkill)) {
        throw new AppError(
          'Your skill level does not meet this group requirement',
          400,
        );
      }

      const existing = await groupJoinRequestRepository.findLatestByGroupUser(
        client,
        groupId,
        callerId,
        { forUpdate: true },
      );
      if (existing?.status === GROUP_JOIN_REQUEST_STATUSES.KICKED) {
        throw new AppError('You were kicked from this group', 403);
      }
      if (existing?.status === GROUP_JOIN_REQUEST_STATUSES.PENDING) {
        throw new AppError('You already have a pending join request', 409);
      }
      if (existing?.status === GROUP_JOIN_REQUEST_STATUSES.ACCEPTED) {
        throw new AppError('You are already a member of this group', 409);
      }

      const autoJoin = group.join_mode === JOIN_MODES.AUTO;
      const payload = {
        groupId,
        userId: callerId,
        message: dto.message || null,
        status: autoJoin
          ? GROUP_JOIN_REQUEST_STATUSES.ACCEPTED
          : GROUP_JOIN_REQUEST_STATUSES.PENDING,
      };

      let request;
      try {
        if (existing) {
          request = await groupJoinRequestRepository.resetRequest(
            client,
            existing.request_id,
            payload,
          );
        } else {
          request = await groupJoinRequestRepository.insert(client, payload);
        }
      } catch (err) {
        if (isUniqueViolation(err)) {
          throw new AppError('You already have a join request for this group', 409);
        }
        throw err;
      }

      const joiner = await userRepository.findById(client, callerId);
      request.full_name = joiner.full_name;
      request.avatar_url = joiner.avatar_url ?? null;

      if (autoJoin) {
        await groupMemberRepository.insertMember(client, groupId, callerId);
        await groupRepository.adjustMemberCount(client, groupId, 1);
      }

      await client.query('COMMIT');

      if (autoJoin) {
        await groupNotification.notifyJoinerApproved(group, callerId);
      } else {
        await groupNotification.notifyAdminJoinRequest(group, joiner, request);
      }

      return {
        message: autoJoin ? 'Joined group' : 'Join request submitted',
        request: toPublicJoinRequest(request, { skill: joinerSkill }),
        group: await loadGroupView(client, group, callerId),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}

export async function withdrawJoinRequest(userId, rawId) {
  const groupId = parseGroupId(rawId);
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const group = await groupRepository.lockById(client, groupId);
      if (!group) {
        throw new AppError('Group not found', 404);
      }

      const request = await groupJoinRequestRepository.findLatestByGroupUser(
        client,
        groupId,
        callerId,
        { forUpdate: true },
      );
      if (!request || request.status !== GROUP_JOIN_REQUEST_STATUSES.PENDING) {
        throw new AppError('No pending join request to cancel', 400);
      }

      await groupJoinRequestRepository.deleteById(client, request.request_id);
      await client.query('COMMIT');
      return {
        message: 'Join request cancelled',
        groupId,
        requestId: request.request_id,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}

export async function listJoinRequests(userId, rawId) {
  const groupId = parseGroupId(rawId);
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    const group = await groupRepository.findById(client, groupId);
    if (!group) {
      throw new AppError('Group not found', 404);
    }
    assertGroupAdmin(group, callerId);

    const rows = await groupJoinRequestRepository.listPendingByGroup(
      client,
      groupId,
    );
    const skillMap = await loadSkillMapForSport(
      client,
      group.sport,
      rows.map((row) => row.user_id),
    );
    return {
      groupId,
      total: rows.length,
      requests: rows.map((row) =>
        toPublicJoinRequest(row, {
          skill: skillMap.get(Number(row.user_id)) ?? null,
        }),
      ),
    };
  } finally {
    client.release();
  }
}

export async function acceptJoinRequest(userId, rawGroupId, rawRequestId) {
  const groupId = parseGroupId(rawGroupId);
  const requestId = parsePositiveInt(rawRequestId, 'Invalid request id');
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const group = await groupRepository.lockById(client, groupId);
      if (!group) {
        throw new AppError('Group not found', 404);
      }
      assertGroupAdmin(group, callerId);

      const request = await groupJoinRequestRepository.findByIdForUpdate(
        client,
        requestId,
      );
      if (!request || Number(request.group_id) !== groupId) {
        throw new AppError('Join request not found', 404);
      }
      if (request.status !== GROUP_JOIN_REQUEST_STATUSES.PENDING) {
        throw new AppError('Join request is not pending', 400, {
          status: request.status,
        });
      }

      const skillRows = await userSportSkillRepository.findByUserId(
        client,
        request.user_id,
      );
      const joinerSkill = skillRows.find((row) => row.sport === group.sport)
        ?.skill_level;
      if (skillOutOfRange(group, joinerSkill)) {
        throw new AppError(
          'Joiner skill level does not meet this group requirement',
          400,
        );
      }

      const existingMember = await groupMemberRepository.findMembership(
        client,
        groupId,
        request.user_id,
      );
      if (!existingMember) {
        await groupMemberRepository.insertMember(
          client,
          groupId,
          request.user_id,
        );
        await groupRepository.adjustMemberCount(client, groupId, 1);
      }

      const updated = await groupJoinRequestRepository.updateStatus(
        client,
        requestId,
        GROUP_JOIN_REQUEST_STATUSES.ACCEPTED,
      );
      updated.full_name = request.full_name;
      updated.avatar_url = request.avatar_url;

      await client.query('COMMIT');
      await groupNotification.notifyJoinerApproved(group, request.user_id);
      return {
        message: 'Join request accepted',
        request: toPublicJoinRequest(updated, { skill: joinerSkill }),
        group: await loadGroupView(client, group, callerId),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}

export async function rejectJoinRequest(userId, rawGroupId, rawRequestId) {
  const groupId = parseGroupId(rawGroupId);
  const requestId = parsePositiveInt(rawRequestId, 'Invalid request id');
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const group = await groupRepository.lockById(client, groupId);
      if (!group) {
        throw new AppError('Group not found', 404);
      }
      assertGroupAdmin(group, callerId);

      const request = await groupJoinRequestRepository.findByIdForUpdate(
        client,
        requestId,
      );
      if (!request || Number(request.group_id) !== groupId) {
        throw new AppError('Join request not found', 404);
      }
      if (request.status !== GROUP_JOIN_REQUEST_STATUSES.PENDING) {
        throw new AppError('Join request is not pending', 400, {
          status: request.status,
        });
      }

      const updated = await groupJoinRequestRepository.updateStatus(
        client,
        requestId,
        GROUP_JOIN_REQUEST_STATUSES.REJECTED,
      );
      updated.full_name = request.full_name;
      updated.avatar_url = request.avatar_url;

      await client.query('COMMIT');
      await groupNotification.notifyJoinerRejected(group, request.user_id);
      return {
        message: 'Join request rejected',
        request: toPublicJoinRequest(updated),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}

export async function kickMember(userId, rawGroupId, rawTargetUserId) {
  const groupId = parseGroupId(rawGroupId);
  const targetUserId = parsePositiveInt(rawTargetUserId, 'Invalid user id');
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const group = await groupRepository.lockById(client, groupId);
      if (!group) {
        throw new AppError('Group not found', 404);
      }
      assertGroupAdmin(group, callerId);
      if (targetUserId === Number(group.admin_user_id)) {
        throw new AppError('Admin cannot be kicked', 400);
      }

      const membership = await groupMemberRepository.findMembershipForUpdate(
        client,
        groupId,
        targetUserId,
      );
      if (!membership) {
        throw new AppError('Member not found in this group', 404);
      }

      await groupMemberRepository.removeMember(client, groupId, targetUserId);
      await groupRepository.adjustMemberCount(client, groupId, -1);
      await groupJoinRequestRepository.upsertKicked(
        client,
        groupId,
        targetUserId,
      );

      await client.query('COMMIT');
      await groupNotification.notifyMemberKicked(group, targetUserId);
      return {
        message: 'Member kicked',
        groupId,
        userId: targetUserId,
        group: await loadGroupView(client, group, callerId),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}

export async function transferAdmin(userId, rawGroupId, rawTargetUserId) {
  const groupId = parseGroupId(rawGroupId);
  const targetUserId = parsePositiveInt(rawTargetUserId, 'Invalid user id');
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const group = await groupRepository.lockById(client, groupId);
      if (!group) {
        throw new AppError('Group not found', 404);
      }
      assertGroupAdmin(group, callerId);
      if (targetUserId === callerId) {
        throw new AppError('You are already the admin', 400);
      }

      const targetMembership = await groupMemberRepository.findMembershipForUpdate(
        client,
        groupId,
        targetUserId,
      );
      if (!targetMembership || targetMembership.role !== GROUP_MEMBER_ROLES.MEMBER) {
        throw new AppError('Target user must be an existing member', 404);
      }

      await groupMemberRepository.updateRole(
        client,
        groupId,
        callerId,
        GROUP_MEMBER_ROLES.MEMBER,
      );
      await groupMemberRepository.updateRole(
        client,
        groupId,
        targetUserId,
        GROUP_MEMBER_ROLES.ADMIN,
      );
      await groupRepository.updateAdminUserId(client, groupId, targetUserId);

      await client.query('COMMIT');
      await groupNotification.notifyAdminTransferred(
        group,
        targetUserId,
        callerId,
      );
      return {
        message: 'Admin role transferred',
        groupId,
        adminUserId: targetUserId,
        group: await loadGroupView(client, {
          ...group,
          admin_user_id: targetUserId,
        }, callerId),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}

export async function leaveGroup(userId, rawId) {
  const groupId = parseGroupId(rawId);
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const group = await groupRepository.lockById(client, groupId);
      if (!group) {
        throw new AppError('Group not found', 404);
      }

      const membership = await groupMemberRepository.findMembershipForUpdate(
        client,
        groupId,
        callerId,
      );
      if (!membership) {
        throw new AppError('You are not a member of this group', 400);
      }
      if (membership.role === GROUP_MEMBER_ROLES.ADMIN) {
        throw new AppError(
          'Admin must transfer admin role or delete the group before leaving',
          400,
        );
      }

      await groupMemberRepository.removeMember(client, groupId, callerId);
      await groupRepository.adjustMemberCount(client, groupId, -1);
      await client.query('COMMIT');
      return {
        message: 'Left group',
        groupId,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}

export async function deleteGroup(userId, rawId) {
  const groupId = parseGroupId(rawId);
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const group = await groupRepository.lockById(client, groupId);
      if (!group) {
        throw new AppError('Group not found', 404);
      }
      assertGroupAdmin(group, callerId);

      await groupRepository.deleteById(client, groupId);
      await client.query('COMMIT');
      return {
        message: 'Group deleted',
        groupId,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}

export async function favoriteGroup(userId, rawId) {
  return setFavorite(userId, rawId, true);
}

export async function unfavoriteGroup(userId, rawId) {
  return setFavorite(userId, rawId, false);
}

async function setFavorite(userId, rawId, favorited) {
  const groupId = parseGroupId(rawId);
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    const group = await groupRepository.findById(client, groupId);
    if (!group) {
      throw new AppError('Group not found', 404);
    }
    if (favorited) {
      await groupFavoriteRepository.add(client, callerId, groupId);
    } else {
      await groupFavoriteRepository.remove(client, callerId, groupId);
    }
    return {
      message: favorited ? 'Group favorited' : 'Group unfavorited',
      groupId,
      isFavorited: favorited,
    };
  } finally {
    client.release();
  }
}

export async function listMyJoinRequests(userId, query) {
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    const filters = {
      userId: callerId,
      limit: query.limit,
      offset: query.offset,
      status: query.status,
    };
    const rows = await groupJoinRequestRepository.listMyJoinRequests(
      client,
      filters,
    );
    const total = await groupJoinRequestRepository.countMyJoinRequests(
      client,
      filters,
    );
    const pendingCount =
      await groupJoinRequestRepository.countMyPendingJoinRequests(
        client,
        callerId,
      );
    return {
      total,
      pendingCount,
      limit: query.limit,
      offset: query.offset,
      requests: rows.map(toPublicMyJoinRequest),
    };
  } finally {
    client.release();
  }
}

export async function listMine(userId, query) {
  const callerId = callerUserId(userId);

  if (
    query.tab === GROUP_MINE_TABS.JOINED &&
    query.section === GROUP_MINE_SECTIONS.JOIN_REQUESTS
  ) {
    const joinResult = await listMyJoinRequests(userId, query);
    return {
      tab: query.tab,
      section: query.section,
      ...joinResult,
    };
  }

  const client = await pool.connect();
  try {
    if (
      query.tab === GROUP_MINE_TABS.MANAGED &&
      query.section === GROUP_MINE_SECTIONS.PENDING_REQUESTS
    ) {
      const rows = await groupJoinRequestRepository.listPendingForAdminGroups(
        client,
        { adminUserId: callerId, limit: query.limit, offset: query.offset },
      );
      const total = await groupJoinRequestRepository.countPendingForAdminGroups(
        client,
        callerId,
      );
      const skillMapByGroup = new Map();
      for (const row of rows) {
        if (!skillMapByGroup.has(row.group_sport)) {
          skillMapByGroup.set(row.group_sport, new Map());
        }
      }
      for (const sport of skillMapByGroup.keys()) {
        const userIds = rows
          .filter((row) => row.group_sport === sport)
          .map((row) => row.user_id);
        const map = await loadSkillMapForSport(client, sport, userIds);
        skillMapByGroup.set(sport, map);
      }
      return {
        tab: query.tab,
        section: query.section,
        total,
        limit: query.limit,
        offset: query.offset,
        requests: rows.map((row) => ({
          ...toPublicJoinRequest(row, {
            skill:
              skillMapByGroup.get(row.group_sport)?.get(Number(row.user_id)) ??
              null,
          }),
          group: {
            groupId: row.group_id,
            name: row.group_name,
            title: row.group_title,
            sport: row.group_sport,
          },
        })),
      };
    }

    let rows;
    let total;
    if (query.tab === GROUP_MINE_TABS.MANAGED) {
      rows = await groupRepository.listManagedGroups(client, {
        adminUserId: callerId,
        limit: query.limit,
        offset: query.offset,
        viewerUserId: callerId,
      });
      total = await groupRepository.countManagedGroups(client, callerId);
    } else {
      rows = await groupRepository.listJoinedMemberGroups(client, {
        userId: callerId,
        limit: query.limit,
        offset: query.offset,
        viewerUserId: callerId,
      });
      total = await groupRepository.countJoinedMemberGroups(client, callerId);
    }

    return {
      tab: query.tab,
      section: query.section,
      total,
      limit: query.limit,
      offset: query.offset,
      groups: await mapMineGroups(client, rows),
    };
  } finally {
    client.release();
  }
}

export async function updateGroup(userId, rawId, body) {
  const groupId = parseGroupId(rawId);
  const callerId = callerUserId(userId);
  const input = parseUpdateGroupDto(body);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const group = await groupRepository.lockById(client, groupId);
      if (!group) {
        throw new AppError('Group not found', 404);
      }
      assertGroupAdmin(group, callerId);

      const updateFields = buildUpdateFields(group, input);
      if (Object.keys(updateFields).length) {
        await groupRepository.updateGroup(client, groupId, updateFields);
      }

      if (input.courts) {
        await groupScheduleRepository.deleteByGroupId(client, groupId);
        await groupCourtRepository.deleteByGroupId(client, groupId);
        const courtRows = await groupCourtRepository.insertCourts(
          client,
          groupId,
          buildCourts({ courts: input.courts }),
        );
        if (input.recurringSlots?.length) {
          await groupScheduleRepository.insertSlots(
            client,
            groupId,
            mapSlotsToCourtIds(input.recurringSlots, courtRows),
          );
        }
      }

      const pendingRows = await groupJoinRequestRepository.listPendingByGroup(
        client,
        groupId,
      );
      const shouldFlushPending =
        input.joinMode === JOIN_MODES.AUTO && pendingRows.length > 0;

      if (shouldFlushPending) {
        const mergedGroup = { ...group, ...updateFields, join_mode: JOIN_MODES.AUTO };
        await flushPendingJoinRequests(client, mergedGroup);
      }

      await client.query('COMMIT');

      if (shouldFlushPending) {
        await groupNotification.notifyJoinersApproved(
          { ...group, ...updateFields, join_mode: JOIN_MODES.AUTO },
          pendingRows.map((row) => row.user_id),
        );
      }

      return {
        message: 'Group updated',
        group: await loadGroupView(client, group, callerId),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}

export async function listMembers(userId, rawId, query) {
  const groupId = parseGroupId(rawId);
  callerUserId(userId);
  const client = await pool.connect();
  try {
    const group = await groupRepository.findById(client, groupId);
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    const filters = {
      search: query.search,
      limit: query.limit,
      offset: query.offset,
    };
    const rows = await groupMemberRepository.listByGroupId(
      client,
      groupId,
      filters,
    );
    const total = await groupMemberRepository.countByGroupId(
      client,
      groupId,
      filters,
    );
    const skillMap = await loadSkillMapForSport(
      client,
      group.sport,
      rows.map((row) => row.user_id),
    );

    return {
      groupId,
      total,
      limit: query.limit,
      offset: query.offset,
      members: rows.map((row) =>
        toPublicMember(row, {
          skill: skillMap.get(Number(row.user_id)) ?? null,
        }),
      ),
    };
  } finally {
    client.release();
  }
}

export async function getSchedule(userId, rawId, query) {
  const groupId = parseGroupId(rawId);
  callerUserId(userId);
  const client = await pool.connect();
  try {
    const group = await groupRepository.findById(client, groupId);
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    const courts = await groupCourtRepository.findByGroupId(client, groupId);
    const recurringSlots = await groupScheduleRepository.findByGroupId(
      client,
      groupId,
    );
    const dayOfWeek = isoDayOfWeekBangkok(query.date);

    return {
      groupId,
      date: query.date,
      dayOfWeek,
      courts: buildScheduleMatrix(courts, recurringSlots, dayOfWeek),
    };
  } finally {
    client.release();
  }
}

export async function listGallery(userId, rawId, query) {
  const groupId = parseGroupId(rawId);
  callerUserId(userId);
  const client = await pool.connect();
  try {
    const group = await groupRepository.findById(client, groupId);
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    const rows = await groupGalleryRepository.listByGroupId(client, groupId, {
      limit: query.limit,
      offset: query.offset,
    });
    const total = await groupGalleryRepository.countByGroupId(client, groupId);

    return {
      groupId,
      total,
      limit: query.limit,
      offset: query.offset,
      images: rows.map(toPublicGalleryImage),
    };
  } finally {
    client.release();
  }
}

export async function addGalleryImage(userId, rawId, body) {
  const groupId = parseGroupId(rawId);
  const callerId = callerUserId(userId);
  const input = parseCreateGalleryImageDto(body);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const group = await groupRepository.lockById(client, groupId);
      if (!group) {
        throw new AppError('Group not found', 404);
      }
      assertGroupAdmin(group, callerId);

      const currentCount = await groupGalleryRepository.countByGroupId(
        client,
        groupId,
      );
      if (currentCount >= GROUP_GALLERY.MAX_IMAGES) {
        throw new AppError(
          `Gallery cannot exceed ${GROUP_GALLERY.MAX_IMAGES} images`,
          400,
        );
      }

      const sortOrder = await groupGalleryRepository.nextSortOrder(
        client,
        groupId,
      );
      const row = await groupGalleryRepository.insert(client, {
        groupId,
        imageUrl: input.imageUrl,
        uploadedBy: callerId,
        sortOrder,
      });

      await client.query('COMMIT');
      return {
        message: 'Gallery image added',
        image: toPublicGalleryImage(row),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}

export async function deleteGalleryImage(userId, rawGroupId, rawImageId) {
  const groupId = parseGroupId(rawGroupId);
  const imageId = parsePositiveInt(rawImageId, 'Invalid image id');
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const group = await groupRepository.lockById(client, groupId);
      if (!group) {
        throw new AppError('Group not found', 404);
      }
      assertGroupAdmin(group, callerId);

      const image = await groupGalleryRepository.findById(
        client,
        groupId,
        imageId,
      );
      if (!image) {
        throw new AppError('Gallery image not found', 404);
      }

      await groupGalleryRepository.deleteById(client, groupId, imageId);
      await client.query('COMMIT');
      return {
        message: 'Gallery image deleted',
        groupId,
        imageId,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}
