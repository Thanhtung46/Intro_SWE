import {
  vnCityName,
  vnProvinceName,
} from '../../../shared/constants/vn-admin.js';

export function toPublicGroup(
  row,
  {
    courts = [],
    recurringSlots = [],
    memberAvatars = [],
    includeSchedule = false,
  } = {},
) {
  if (!row) return null;

  const group = {
    groupId: row.group_id,
    sport: row.sport,
    name: row.name,
    title: row.title,
    description: row.description ?? null,
    joinMode: row.join_mode,
    logoUrl: row.logo_url ?? null,
    coverUrl: row.cover_url ?? null,
    venueName: row.venue_name,
    venueAddress: row.venue_address,
    province: row.province ?? null,
    provinceName: vnProvinceName(row.province),
    city: row.city ?? null,
    cityName: vnCityName(row.province, row.city),
    latitude: row.venue_lat == null ? null : Number(row.venue_lat),
    longitude: row.venue_lng == null ? null : Number(row.venue_lng),
    skillMin: row.skill_min,
    skillMax: row.skill_max,
    allLevels: Boolean(row.all_levels),
    zaloUrl: row.zalo_url ?? null,
    memberCount: Number(row.member_count ?? 0),
    isFavorited: Boolean(row.is_favorited),
    myRole: row.my_role ?? null,
    admin: {
      userId: row.admin_user_id,
      fullName: row.admin_full_name ?? undefined,
      avatarUrl: row.admin_avatar_url ?? null,
    },
    memberAvatars: memberAvatars.filter(Boolean).slice(0, 3),
    courtCount: courts.length,
    courts: courts.map((court) => ({
      courtId: court.court_id,
      name: court.name,
      sortOrder: court.sort_order,
    })),
    createdAt: row.created_at,
  };

  if (includeSchedule) {
    group.recurringSlots = recurringSlots.map((slot) => ({
      slotId: slot.slot_id,
      dayOfWeek: Number(slot.day_of_week),
      startsAt: formatTime(slot.start_time),
      durationMinutes: Number(slot.duration_minutes),
      courtName: slot.court_name,
      courtId: slot.court_id,
    }));
  }

  return group;
}

export function toPublicJoinRequest(row, { skill = null } = {}) {
  if (!row) return null;
  return {
    requestId: row.request_id,
    groupId: row.group_id,
    userId: row.user_id,
    fullName: row.full_name ?? undefined,
    avatarUrl: row.avatar_url ?? null,
    skill: skill ?? undefined,
    message: row.message ?? null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toPublicMyJoinRequest(row) {
  if (!row) return null;
  return {
    requestId: row.request_id,
    status: row.status,
    message: row.message ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    group: {
      groupId: row.group_id,
      name: row.group_name,
      title: row.group_title,
      sport: row.group_sport,
      joinMode: row.group_join_mode,
      venueName: row.group_venue_name,
      venueAddress: row.group_venue_address,
      adminFullName: row.admin_full_name ?? undefined,
      adminAvatarUrl: row.admin_avatar_url ?? null,
    },
  };
}

export function toPublicMineGroup(row, { courts = [], memberAvatars = [] } = {}) {
  const group = toPublicGroup(row, { courts, memberAvatars });
  if (!group) return null;
  return {
    ...group,
    pendingRequestCount:
      row.my_role === 'ADMIN' ? Number(row.pending_request_count ?? 0) : 0,
  };
}

function formatTime(value) {
  if (!value) return null;
  const text = String(value);
  return text.length >= 5 ? text.slice(0, 5) : text;
}

export function toPublicMember(row, { skill = null } = {}) {
  if (!row) return null;
  return {
    userId: row.user_id,
    fullName: row.full_name ?? undefined,
    avatarUrl: row.avatar_url ?? null,
    role: row.role,
    isAdmin: row.role === 'ADMIN',
    skill: skill ?? undefined,
    joinedAt: row.joined_at,
  };
}

export function toPublicGalleryImage(row) {
  if (!row) return null;
  return {
    imageId: row.image_id,
    imageUrl: row.image_url,
    uploadedBy: row.uploaded_by,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}
