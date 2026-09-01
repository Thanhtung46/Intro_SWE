import {
  computeYourShare,
  MATCH_STATUSES,
} from '../../../shared/constants/matchmaking.js';
import {
  vnCityName,
  vnProvinceName,
} from '../../../shared/constants/vn-admin.js';

export function toPublicMatch(
  row,
  courts = [],
  { gender, includeHostPhone = false, participantAvatars = [], hostRating = null } = {},
) {
  if (!row) return null;

  const maxPlayers = Number(row.max_players);
  const filledCount = Number(row.filled_count);
  const spotsLeft = Math.max(0, maxPlayers - filledCount);
  const status =
    row.status === MATCH_STATUSES.OPEN && filledCount >= maxPlayers
      ? MATCH_STATUSES.FULL
      : row.status;
  const previewAvatars = (participantAvatars.length
    ? participantAvatars
    : row.participant_avatars || []
  ).filter(Boolean).slice(0, 3);

  return {
    matchId: row.match_id,
    hostUserId: row.host_user_id,
    hostFullName: row.host_full_name ?? undefined,
    host: {
      userId: row.host_user_id,
      fullName: row.host_full_name ?? undefined,
      avatarUrl: row.host_avatar_url ?? null,
      matchCount: Number(row.host_match_count ?? 0),
      rating: hostRating?.avgRating ?? null,
      reviewCount: hostRating?.reviewCount ?? 0,
    },
    ...(includeHostPhone
      ? { hostPhoneNumber: row.host_phone_number ?? null }
      : {}),
    coverUrl: row.cover_url ?? null,
    isFavorited: Boolean(row.is_favorited),
    participantAvatars: previewAvatars,
    sport: row.sport,
    format: row.format,
    title: row.title,
    notes: row.notes ?? null,
    venueName: row.venue_name,
    venueAddress: row.venue_address,
    province: row.province ?? null,
    provinceName: vnProvinceName(row.province),
    city: row.city ?? null,
    cityName: vnCityName(row.province, row.city),
    latitude: row.venue_lat == null ? null : Number(row.venue_lat),
    longitude: row.venue_lng == null ? null : Number(row.venue_lng),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isMultiDay: Boolean(row.is_multi_day),
    isRecurring: Boolean(row.is_recurring),
    maxPlayers,
    filledCount,
    spotsLeft,
    squad: { filled: filledCount, max: maxPlayers },
    skillMin: row.skill_min,
    skillMax: row.skill_max,
    allLevels: Boolean(row.all_levels),
    feeType: row.fee_type,
    priceMin: row.price_min ?? null,
    priceMax: row.price_max ?? null,
    yourShare: computeYourShare({
      feeType: row.fee_type,
      priceMin: row.price_min,
      priceMax: row.price_max,
      filledCount,
      gender,
    }),
    joinMode: row.join_mode,
    status,
    courtCount: courts.length,
    courts: courts.map((court) => ({
      courtId: court.court_id,
      name: court.name ?? null,
      sortOrder: court.sort_order,
    })),
    createdAt: row.created_at,
  };
}

export function toPublicGuest(row, { includePhone = true } = {}) {
  if (!row) return null;
  const guest = {
    guestId: row.guest_id,
    name: row.name,
    skill: row.skill,
    gender: row.gender,
  };
  if (includePhone) {
    guest.phoneNumber = row.phone ?? null;
  }
  return guest;
}

export function toPublicJoinRequest(
  row,
  guests = [],
  { includePhone = true, skill = undefined } = {},
) {
  if (!row) return null;
  const request = {
    requestId: row.request_id,
    matchId: row.match_id,
    userId: row.user_id,
    fullName: row.full_name ?? undefined,
    avatarUrl: row.avatar_url ?? null,
    gender: row.gender ?? undefined,
    message: row.message ?? null,
    status: row.status,
    skillWarning: Boolean(row.skill_warning),
    heads: Number(row.heads),
    shareAmount: row.share_amount ?? null,
    paymentStatus: row.payment_status ?? null,
    guests: guests.map((guest) => toPublicGuest(guest, { includePhone })),
    createdAt: row.created_at,
  };
  if (skill !== undefined) {
    request.skill = skill ?? null;
  }
  if (includePhone) {
    request.phoneNumber = row.contact_phone || row.phone_number || null;
  }
  return request;
}

export function guestsByRequestId(guestRows = []) {
  const map = new Map();
  for (const row of guestRows) {
    const list = map.get(row.request_id) || [];
    list.push(row);
    map.set(row.request_id, list);
  }
  return map;
}
