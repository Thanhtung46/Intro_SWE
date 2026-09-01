import pool from '../../../shared/database/pool.js';
import { AppError } from '../../../shared/middleware/errorHandler.js';
import { USER_ROLES, PG_INT4_MAX } from '../../../shared/constants/auth.js';
import { SKILLS_BY_SPORT, rankForSkill } from '../../../shared/constants/sports.js';
import {
  FEE_TYPES,
  JOIN_MODES,
  JOIN_REQUEST_STATUSES,
  MATCH_STATUSES,
  MINE_TABS,
  MY_MATCH_ROLES,
  PAYMENT_STATUSES,
  PITCH_OCCUPIED_STATUSES,
  computeRequestShare,
  pitchKey,
  normalizeCourtName,
} from '../../../shared/constants/matchmaking.js';
import * as userRepository from '../../auth/repository/user.repository.js';
import * as userSportSkillRepository from '../../auth/repository/user-sport-skill.repository.js';
import * as matchRepository from '../repository/match.repository.js';
import * as matchCourtRepository from '../repository/match-court.repository.js';
import * as joinRequestRepository from '../repository/join-request.repository.js';
import * as matchFavoriteRepository from '../repository/match-favorite.repository.js';
import { parseCreateMatchDto } from '../dto/create-match.dto.js';
import { parseJoinMatchDto } from '../dto/join-match.dto.js';
import {
  vnCityName,
  vnProvinceName,
} from '../../../shared/constants/vn-admin.js';
import {
  toPublicMatch,
  toPublicJoinRequest,
  guestsByRequestId,
} from '../entity/match.entity.js';
import { attachMatchOutcome } from '../match-outcome.js';
import { createNotification } from '../../notification/service/notification.service.js';
import { NOTIFICATION_TYPES } from '../../../shared/constants/notification.js';
import {
  buildMatchReviewSummary,
  getHostRatingForUser,
  getHostRatingMap,
} from '../../review/service/match-host-review.service.js';

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

function parseMatchId(raw) {
  const matchId = Number(raw);
  if (!Number.isInteger(matchId) || matchId < 1 || matchId > PG_INT4_MAX) {
    throw new AppError('Invalid match id', 400);
  }
  return matchId;
}

function parsePositiveInt(raw, message) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > PG_INT4_MAX) {
    throw new AppError(message, 400);
  }
  return value;
}

function callerUserId(raw) {
  return parsePositiveInt(raw, 'Invalid user id');
}

function isUniqueViolation(err) {
  return err?.code === '23505';
}

async function callerGender(client, userId) {
  const user = await userRepository.findById(client, userId);
  return user?.gender ?? null;
}

function spotsLeft(match) {
  return Math.max(0, Number(match.max_players) - Number(match.filled_count));
}

function nextOpenOrFull(match, filledCount) {
  if (
    match.status === MATCH_STATUSES.CANCELLED ||
    match.status === MATCH_STATUSES.COMPLETED
  ) {
    return match.status;
  }
  return filledCount >= Number(match.max_players)
    ? MATCH_STATUSES.FULL
    : MATCH_STATUSES.OPEN;
}

function assertJoinable(match) {
  if (!match) {
    throw new AppError('Match not found', 404);
  }
  if (match.status === MATCH_STATUSES.CANCELLED) {
    throw new AppError('Match is cancelled', 400);
  }
  if (match.status === MATCH_STATUSES.COMPLETED) {
    throw new AppError('Match is completed', 400);
  }
  if (match.status === MATCH_STATUSES.FULL || spotsLeft(match) < 1) {
    throw new AppError('Match is full', 400);
  }
  if (new Date(match.ends_at).getTime() <= Date.now()) {
    throw new AppError('Match has ended', 400);
  }
}

function skillOutOfRange(match, skillCode) {
  if (match.all_levels) {
    return false;
  }
  const rank = rankForSkill(match.sport, skillCode);
  if (rank == null) {
    return true;
  }
  return (
    rank < Number(match.skill_min_rank) || rank > Number(match.skill_max_rank)
  );
}

function requireFeeGender(match, gender, message) {
  if (match.fee_type !== FEE_TYPES.GENDER_RANGE) {
    return;
  }
  if (gender !== 'female' && gender !== 'male') {
    throw new AppError(message, 400);
  }
}

function shareForRequest(match, filledCount, joinerGender, guests) {
  const shareAmount = computeRequestShare({
    feeType: match.fee_type,
    priceMin: match.price_min,
    priceMax: match.price_max,
    filledCount,
    joinerGender,
    guests,
  });
  if (shareAmount == null) {
    throw new AppError('Unable to compute payment share for this request', 400);
  }
  return shareAmount;
}

async function loadGuestsMap(client, requests) {
  const ids = requests.map((row) => row.request_id);
  const guestRows = await joinRequestRepository.findGuestsByRequestIds(
    client,
    ids,
  );
  return guestsByRequestId(guestRows);
}

async function loadSkillMapForSport(client, sport, userIds) {
  const uniqueIds = [...new Set(userIds.map(Number).filter(Boolean))];
  return userSportSkillRepository.findSkillsByUserIdsAndSport(
    client,
    uniqueIds,
    sport,
  );
}

async function loadHostRatingMap(client, rows) {
  const hostIds = [...new Set(rows.map((row) => Number(row.host_user_id)))];
  return getHostRatingMap(client, hostIds);
}

async function loadMatchView(client, match, userId, { includeHostPhone = false } = {}) {
  const courts = await matchCourtRepository.findByMatchId(
    client,
    match.match_id,
  );
  const gender = await callerGender(client, userId);
  const favorited = await matchFavoriteRepository.exists(
    client,
    userId,
    match.match_id,
  );
  match.is_favorited = favorited;
  const avatarsByMatch = await matchRepository.listPreviewAvatars(client, [
    match.match_id,
  ]);
  const hostRating = await getHostRatingForUser(
    client,
    Number(match.host_user_id),
  );
  return toPublicMatch(match, courts, {
    gender,
    includeHostPhone,
    participantAvatars: avatarsByMatch.get(match.match_id) || [],
    hostRating,
  });
}

async function persistNewMatch(client, host, input) {
  const skills = resolveSkillRange(input);
  const courts = buildCourts(input);
  const courtNames = courts.map((court) => normalizeCourtName(court.name));
  const feeType = input.feeType;
  const priceMin = input.priceMin;
  const priceMax = feeType === FEE_TYPES.GENDER_RANGE ? input.priceMax : null;

  await matchRepository.lockPitches(
    client,
    courts.map((court) =>
      pitchKey(input.venueName, input.venueAddress, court.name),
    ),
  );
  const overlapRows = await matchRepository.findPitchOverlaps(client, {
    venueName: input.venueName,
    venueAddress: input.venueAddress,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    courtNames,
  });
  if (overlapRows.length) {
    const row = overlapRows[0];
    throw new AppError(
      'This pitch is already booked at an overlapping time',
      409,
      {
        matchId: row.match_id,
        hostUserId: row.host_user_id,
        title: row.title,
        venueName: row.venue_name,
        venueAddress: row.venue_address,
        courtName: row.court_name,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
      },
    );
  }

  const match = await matchRepository.createMatch(client, {
    hostUserId: host.user_id,
    sport: input.sport,
    format: input.format,
    title: input.title,
    notes: input.notes || null,
    venueName: input.venueName,
    venueAddress: input.venueAddress,
    province: input.province,
    city: input.city,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    isMultiDay: false,
    isRecurring: Boolean(input.isRecurring),
    maxPlayers: input.maxPlayers,
    skillMin: skills.skillMin,
    skillMax: skills.skillMax,
    skillMinRank: skills.skillMinRank,
    skillMaxRank: skills.skillMaxRank,
    allLevels: skills.allLevels,
    feeType,
    priceMin,
    priceMax,
    joinMode: input.joinMode,
    coverUrl: input.coverUrl ?? null,
  });
  const courtRows = await matchCourtRepository.insertCourts(
    client,
    match.match_id,
    courts,
  );
  return { match, courtRows };
}

function formatCreatedMatch(host, match, courtRows) {
  match.host_full_name = host.full_name;
  match.host_phone_number = host.phone_number;
  match.host_avatar_url = host.avatar_url ?? null;
  match.host_match_count = 1;
  match.is_favorited = false;
  return toPublicMatch(match, courtRows, {
    gender: host.gender,
    includeHostPhone: true,
    participantAvatars: host.avatar_url ? [host.avatar_url] : [],
  });
}

async function assertPlayerHost(client, hostUserId) {
  const host = await userRepository.findById(client, hostUserId);
  if (!host) {
    throw new AppError('User not found', 404);
  }
  if (host.role !== USER_ROLES.PLAYER) {
    throw new AppError('Only PLAYER accounts can host a match', 403);
  }
  return host;
}

export async function createMatch(hostUserId, input) {
  const client = await pool.connect();
  try {
    const host = await assertPlayerHost(client, hostUserId);

    await client.query('BEGIN');
    let match;
    let courtRows;
    try {
      ({ match, courtRows } = await persistNewMatch(client, host, {
        ...input,
        isMultiDay: false,
      }));
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

    return {
      message: 'Match created',
      match: formatCreatedMatch(host, match, courtRows),
    };
  } finally {
    client.release();
  }
}

export async function createMatchesBulk(hostUserId, { template, schedules }) {
  const client = await pool.connect();
  let host;
  try {
    host = await assertPlayerHost(client, hostUserId);
  } finally {
    client.release();
  }

  const isRecurring = schedules.length > 1 || Boolean(template.isRecurring);
  const created = [];
  const failed = [];

  for (const schedule of schedules) {
    const input = {
      ...template,
      ...schedule,
      isMultiDay: false,
      isRecurring,
    };
    parseCreateMatchDto(input);
    const slotClient = await pool.connect();
    try {
      await slotClient.query('BEGIN');
      try {
        const { match, courtRows } = await persistNewMatch(
          slotClient,
          host,
          input,
        );
        await slotClient.query('COMMIT');
        created.push(formatCreatedMatch(host, match, courtRows));
      } catch (err) {
        await slotClient.query('ROLLBACK');
        if (err instanceof AppError && err.statusCode === 409) {
          failed.push({
            startsAt: schedule.startsAt,
            endsAt: schedule.endsAt,
            message: err.message,
            details: err.details ?? null,
          });
          continue;
        }
        throw err;
      }
    } finally {
      slotClient.release();
    }
  }

  if (!created.length && failed.length) {
    throw new AppError('No matches were created', 409, {
      failed,
      totalRequested: schedules.length,
      totalCreated: 0,
    });
  }

  return {
    message:
      created.length === schedules.length
        ? 'Matches created'
        : 'Some matches were created',
    totalRequested: schedules.length,
    totalCreated: created.length,
    created,
    failed,
  };
}

export async function listVenueSuggestions(_userId, query) {
  const client = await pool.connect();
  try {
    const rows = await matchRepository.listVenueSuggestions(client, {
      location: query.location,
      sport: query.sport,
      limit: query.limit,
    });
    return {
      suggestions: rows.map((row) => ({
        venueName: row.venue_name,
        venueAddress: row.venue_address,
        province: row.province ?? null,
        provinceName: vnProvinceName(row.province),
        city: row.city ?? null,
        cityName: vnCityName(row.province, row.city),
        latitude: row.venue_lat == null ? null : Number(row.venue_lat),
        longitude: row.venue_lng == null ? null : Number(row.venue_lng),
      })),
    };
  } finally {
    client.release();
  }
}

export async function listMatches(userId, query) {
  const client = await pool.connect();
  try {
    const gender = await callerGender(client, userId);
    const filters = {
      sport: query.sport,
      date: query.date,
      timeFrom: query.timeFrom,
      timeTo: query.timeTo,
      skillRanks: (query.skill || [])
        .map((code) => rankForSkill(query.sport, code))
        .filter((rank) => rank != null),
      formats: query.format?.length ? query.format : undefined,
      priceMin: query.priceMin,
      priceMax: query.priceMax,
      location: query.location,
      province: query.province,
      city: query.city,
      latitude: query.latitude,
      longitude: query.longitude,
      radiusKm: query.radiusKm,
      favorited: Boolean(query.favorited),
      hostUserId: query.hostUserId,
      limit: query.limit,
      offset: query.offset,
      viewerUserId: callerUserId(userId),
    };

    const rows = await matchRepository.listMatches(client, filters);
    const total = await matchRepository.countMatches(client, filters);
    const suggestions = await matchRepository.listSearchSuggestions(
      client,
      filters,
    );

    const matchIds = rows.map((row) => row.match_id);
    const courtRows = await matchCourtRepository.findByMatchIds(
      client,
      matchIds,
    );
    const avatarsByMatch = await matchRepository.listPreviewAvatars(
      client,
      matchIds,
    );
    const courtsByMatch = new Map();
    for (const court of courtRows) {
      const list = courtsByMatch.get(court.match_id) || [];
      list.push(court);
      courtsByMatch.set(court.match_id, list);
    }
    const hostRatingMap = await loadHostRatingMap(client, rows);

    return {
      total,
      limit: query.limit,
      offset: query.offset,
      matches: rows.map((row) =>
        toPublicMatch(row, courtsByMatch.get(row.match_id) || [], {
          gender,
          participantAvatars: avatarsByMatch.get(row.match_id) || [],
          hostRating: hostRatingMap.get(Number(row.host_user_id)) ?? null,
        }),
      ),
      suggestions,
    };
  } finally {
    client.release();
  }
}

export async function getMatch(userId, rawId) {
  const matchId = parseMatchId(rawId);
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    const row = await matchRepository.findById(client, matchId, callerId);
    if (!row) {
      throw new AppError('Match not found', 404);
    }

    const courts = await matchCourtRepository.findByMatchId(client, matchId);
    const gender = await callerGender(client, callerId);
    const latestRequestRow = await joinRequestRepository.findLatestByMatchUser(
      client,
      matchId,
      callerId,
    );
    const yourRequestRow =
      latestRequestRow &&
      (latestRequestRow.status === JOIN_REQUEST_STATUSES.PENDING ||
        latestRequestRow.status === JOIN_REQUEST_STATUSES.ACCEPTED ||
        latestRequestRow.status === JOIN_REQUEST_STATUSES.KICKED)
        ? latestRequestRow
        : null;
    const acceptedRows = await joinRequestRepository.listAcceptedByMatch(
      client,
      matchId,
    );

    const guestMap = await loadGuestsMap(
      client,
      [yourRequestRow, ...acceptedRows].filter(Boolean),
    );
    const yourSkill =
      yourRequestRow != null
        ? (await loadSkillMapForSport(client, row.sport, [callerId])).get(
            callerId,
          ) ?? null
        : undefined;
    const yourRequest = yourRequestRow
      ? toPublicJoinRequest(
          yourRequestRow,
          guestMap.get(yourRequestRow.request_id) || [],
          yourSkill !== undefined ? { skill: yourSkill } : {},
        )
      : null;
    const isHost = callerId === Number(row.host_user_id);
    const includeHostPhone =
      isHost ||
      yourRequestRow?.status === JOIN_REQUEST_STATUSES.ACCEPTED;
    const avatarsByMatch = await matchRepository.listPreviewAvatars(client, [
      matchId,
    ]);
    const hostRating = await getHostRatingForUser(
      client,
      Number(row.host_user_id),
    );
    const publicMatch = toPublicMatch(row, courts, {
      gender,
      includeHostPhone,
      participantAvatars: avatarsByMatch.get(matchId) || [],
      hostRating,
    });
    const canJoin =
      !isHost &&
      publicMatch.status === MATCH_STATUSES.OPEN &&
      publicMatch.spotsLeft >= 1 &&
      !yourRequest &&
      new Date(row.ends_at).getTime() > Date.now();

    const participantSkillMap = await loadSkillMapForSport(
      client,
      row.sport,
      [row.host_user_id, ...acceptedRows.map((request) => request.user_id)],
    );

    const participants = [
      {
        userId: row.host_user_id,
        fullName: row.host_full_name ?? undefined,
        avatarUrl: row.host_avatar_url ?? null,
        skill: participantSkillMap.get(Number(row.host_user_id)) ?? null,
        role: 'HOST',
        heads: 1,
        guests: [],
        ...(includeHostPhone
          ? { phoneNumber: row.host_phone_number ?? null }
          : {}),
      },
      ...acceptedRows.map((request) => {
        const showPhone =
          isHost || callerId === Number(request.user_id);
        return {
          userId: request.user_id,
          fullName: request.full_name ?? undefined,
          avatarUrl: request.avatar_url ?? null,
          gender: request.gender ?? undefined,
          skill: participantSkillMap.get(Number(request.user_id)) ?? null,
          shareAmount: request.share_amount ?? null,
          paymentStatus: request.payment_status ?? null,
          role: 'PLAYER',
          requestId: request.request_id,
          heads: Number(request.heads),
          ...(showPhone
            ? {
                phoneNumber:
                  request.contact_phone || request.phone_number || null,
              }
            : {}),
          guests: (guestMap.get(request.request_id) || []).map((guest) => ({
            guestId: guest.guest_id,
            name: guest.name,
            skill: guest.skill,
            gender: guest.gender,
            ...(showPhone ? { phoneNumber: guest.phone ?? null } : {}),
          })),
        };
      }),
    ];

    const summary = await buildMatchReviewSummary(client, row, callerId);

    return {
      match: attachMatchOutcome(publicMatch, row),
      canJoin,
      isHost,
      yourRequest,
      participants,
      summary,
    };
  } finally {
    client.release();
  }
}

export async function withdrawJoinRequest(userId, rawId) {
  const matchId = parseMatchId(rawId);
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const match = await matchRepository.lockById(client, matchId);
      if (!match) {
        throw new AppError('Match not found', 404);
      }
      if (callerId === Number(match.host_user_id)) {
        throw new AppError('Host cannot withdraw a join request', 400);
      }

      const request = await joinRequestRepository.findLatestByMatchUser(
        client,
        matchId,
        callerId,
        { forUpdate: true },
      );
      if (!request || request.status !== JOIN_REQUEST_STATUSES.PENDING) {
        throw new AppError('No pending join request to cancel', 400);
      }

      await joinRequestRepository.deleteById(client, request.request_id);
      await client.query('COMMIT');
      return {
        message: 'Join request cancelled',
        matchId,
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

export async function joinMatch(userId, rawId, body) {
  const matchId = parseMatchId(rawId);
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const match = await matchRepository.lockById(client, matchId);
      assertJoinable(match);

      if (callerId === Number(match.host_user_id)) {
        throw new AppError('Host cannot join their own match', 400);
      }

      const joiner = await userRepository.findById(client, callerId);
      if (!joiner) {
        throw new AppError('User not found', 404);
      }
      if (joiner.role !== USER_ROLES.PLAYER) {
        throw new AppError('Only PLAYER accounts can join a match', 403);
      }

      const dto = parseJoinMatchDto(body, { sport: match.sport });
      const heads = 1 + dto.guests.length;
      if (heads > spotsLeft(match)) {
        throw new AppError('Not enough spots left', 400, {
          heads,
          spotsLeft: spotsLeft(match),
        });
      }

      requireFeeGender(
        match,
        joiner.gender,
        'Profile gender must be male or female to join this match',
      );

      const skillRows = await userSportSkillRepository.findByUserId(
        client,
        callerId,
      );
      const joinerSkill = skillRows.find((row) => row.sport === match.sport)
        ?.skill_level;
      const skillWarning =
        skillOutOfRange(match, joinerSkill) ||
        dto.guests.some((guest) => skillOutOfRange(match, guest.skill));

      const autoJoin = match.join_mode === JOIN_MODES.AUTO;
      const filledAfter = Number(match.filled_count) + heads;
      const shareAmount = autoJoin
        ? shareForRequest(match, filledAfter, joiner.gender, dto.guests)
        : null;

      const existing = await joinRequestRepository.findLatestByMatchUser(
        client,
        matchId,
        callerId,
        { forUpdate: true },
      );
      if (existing?.status === JOIN_REQUEST_STATUSES.KICKED) {
        throw new AppError('You were kicked from this match', 403);
      }
      if (
        existing &&
        (existing.status === JOIN_REQUEST_STATUSES.PENDING ||
          existing.status === JOIN_REQUEST_STATUSES.ACCEPTED)
      ) {
        throw new AppError(
          'You already have a pending or accepted request for this match',
          409,
        );
      }

      const payload = {
        matchId,
        userId: callerId,
        message: dto.message || null,
        status: autoJoin
          ? JOIN_REQUEST_STATUSES.ACCEPTED
          : JOIN_REQUEST_STATUSES.PENDING,
        skillWarning,
        heads,
        shareAmount,
        paymentStatus: autoJoin ? PAYMENT_STATUSES.SUCCESS : null,
        contactPhone: dto.phoneNumber || joiner.phone_number || null,
      };

      let request;
      try {
        if (existing) {
          await joinRequestRepository.deleteGuestsByRequestId(
            client,
            existing.request_id,
          );
          request = await joinRequestRepository.resetRequest(
            client,
            existing.request_id,
            payload,
          );
        } else {
          request = await joinRequestRepository.insert(client, payload);
        }
      } catch (err) {
        if (isUniqueViolation(err)) {
          throw new AppError(
            'You already have a pending or accepted request for this match',
            409,
          );
        }
        throw err;
      }

      const guestRows = await joinRequestRepository.insertGuests(
        client,
        request.request_id,
        dto.guests,
      );
      request.full_name = joiner.full_name;
      request.gender = joiner.gender;
      request.phone_number = joiner.phone_number;

      if (autoJoin) {
        await matchRepository.updateFilledCount(
          client,
          matchId,
          filledAfter,
          nextOpenOrFull(match, filledAfter),
        );
        match.filled_count = filledAfter;
        match.status = nextOpenOrFull(match, filledAfter);
      }

      await client.query('COMMIT');

      const publicRequest = toPublicJoinRequest(request, guestRows);
      const publicMatch = await loadMatchView(client, match, callerId, {
        includeHostPhone: autoJoin,
      });
      return {
        message: autoJoin ? 'Joined match' : 'Join request submitted',
        skillWarning,
        warning: skillWarning
          ? 'Your skill (or a guest skill) is outside this match range'
          : null,
        request: publicRequest,
        match: publicMatch,
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
  const matchId = parseMatchId(rawId);
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    const match = await matchRepository.findById(client, matchId);
    if (!match) {
      throw new AppError('Match not found', 404);
    }
    if (callerId !== Number(match.host_user_id)) {
      throw new AppError('Only the host can list join requests', 403);
    }

    const rows = await joinRequestRepository.listByMatch(client, matchId);
    const guestMap = await loadGuestsMap(client, rows);
    const skillMap = await loadSkillMapForSport(
      client,
      match.sport,
      rows.map((row) => row.user_id),
    );
    return {
      matchId,
      total: rows.length,
      requests: rows.map((row) =>
        toPublicJoinRequest(row, guestMap.get(row.request_id) || [], {
          skill: skillMap.get(Number(row.user_id)) ?? null,
        }),
      ),
    };
  } finally {
    client.release();
  }
}

export async function acceptJoinRequest(userId, rawMatchId, rawRequestId) {
  const matchId = parseMatchId(rawMatchId);
  const requestId = parsePositiveInt(rawRequestId, 'Invalid request id');
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const match = await matchRepository.lockById(client, matchId);
      if (!match) {
        throw new AppError('Match not found', 404);
      }
      if (callerId !== Number(match.host_user_id)) {
        throw new AppError('Only the host can accept join requests', 403);
      }
      assertJoinable(match);

      const request = await joinRequestRepository.findByIdForUpdate(
        client,
        requestId,
      );
      if (!request || Number(request.match_id) !== matchId) {
        throw new AppError('Join request not found', 404);
      }
      if (request.status !== JOIN_REQUEST_STATUSES.PENDING) {
        throw new AppError('Join request is not pending', 400, {
          status: request.status,
        });
      }

      const heads = Number(request.heads);
      if (heads > spotsLeft(match)) {
        throw new AppError('Not enough spots left', 400, {
          heads,
          spotsLeft: spotsLeft(match),
        });
      }

      const guests = await joinRequestRepository.findGuestsByRequestIds(
        client,
        [requestId],
      );
      requireFeeGender(
        match,
        request.gender,
        'Joiner gender must be male or female to accept this request',
      );
      const filledAfter = Number(match.filled_count) + heads;
      const shareAmount = shareForRequest(
        match,
        filledAfter,
        request.gender,
        guests,
      );

      const updated = await joinRequestRepository.updateDecision(client, requestId, {
        status: JOIN_REQUEST_STATUSES.ACCEPTED,
        shareAmount,
        paymentStatus: PAYMENT_STATUSES.SUCCESS,
      });
      updated.full_name = request.full_name;
      updated.gender = request.gender;
      updated.contact_phone = request.contact_phone;
      updated.phone_number = request.phone_number;

      await matchRepository.updateFilledCount(
        client,
        matchId,
        filledAfter,
        nextOpenOrFull(match, filledAfter),
      );
      match.filled_count = filledAfter;
      match.status = nextOpenOrFull(match, filledAfter);

      await client.query('COMMIT');

      return {
        message: 'Join request accepted',
        request: toPublicJoinRequest(updated, guests),
        match: await loadMatchView(client, match, callerId, {
          includeHostPhone: true,
        }),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}

export async function rejectJoinRequest(userId, rawMatchId, rawRequestId) {
  const matchId = parseMatchId(rawMatchId);
  const requestId = parsePositiveInt(rawRequestId, 'Invalid request id');
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const match = await matchRepository.lockById(client, matchId);
      if (!match) {
        throw new AppError('Match not found', 404);
      }
      if (callerId !== Number(match.host_user_id)) {
        throw new AppError('Only the host can reject join requests', 403);
      }

      const request = await joinRequestRepository.findByIdForUpdate(
        client,
        requestId,
      );
      if (!request || Number(request.match_id) !== matchId) {
        throw new AppError('Join request not found', 404);
      }
      if (request.status !== JOIN_REQUEST_STATUSES.PENDING) {
        throw new AppError('Join request is not pending', 400, {
          status: request.status,
        });
      }

      const guests = await joinRequestRepository.findGuestsByRequestIds(
        client,
        [requestId],
      );
      const updated = await joinRequestRepository.updateDecision(client, requestId, {
        status: JOIN_REQUEST_STATUSES.REJECTED,
        shareAmount: null,
        paymentStatus: null,
      });
      updated.full_name = request.full_name;
      updated.gender = request.gender;
      updated.contact_phone = request.contact_phone;
      updated.phone_number = request.phone_number;

      await client.query('COMMIT');
      return {
        message: 'Join request rejected',
        request: toPublicJoinRequest(updated, guests),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}

export async function kickParticipant(userId, rawMatchId, rawTargetUserId) {
  const matchId = parseMatchId(rawMatchId);
  const targetUserId = parsePositiveInt(rawTargetUserId, 'Invalid user id');
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const match = await matchRepository.lockById(client, matchId);
      if (!match) {
        throw new AppError('Match not found', 404);
      }
      if (callerId !== Number(match.host_user_id)) {
        throw new AppError('Only the host can kick participants', 403);
      }
      if (
        match.status === MATCH_STATUSES.CANCELLED ||
        match.status === MATCH_STATUSES.COMPLETED
      ) {
        throw new AppError(`Match is ${match.status.toLowerCase()}`, 400);
      }
      if (targetUserId === Number(match.host_user_id)) {
        throw new AppError('Host cannot be kicked', 400);
      }

      const request = await joinRequestRepository.findAcceptedByMatchUser(
        client,
        matchId,
        targetUserId,
        { forUpdate: true },
      );
      if (!request) {
        throw new AppError('Participant not found on this match', 404);
      }

      const guests = await joinRequestRepository.findGuestsByRequestIds(
        client,
        [request.request_id],
      );
      const filledAfter = Math.max(
        1,
        Number(match.filled_count) - Number(request.heads),
      );
      const updated = await joinRequestRepository.updateDecision(
        client,
        request.request_id,
        {
          status: JOIN_REQUEST_STATUSES.KICKED,
          shareAmount: request.share_amount,
          paymentStatus: request.payment_status,
        },
      );
      updated.full_name = request.full_name;
      updated.gender = request.gender;
      updated.contact_phone = request.contact_phone;
      updated.phone_number = request.phone_number;

      await matchRepository.updateFilledCount(
        client,
        matchId,
        filledAfter,
        nextOpenOrFull(match, filledAfter),
      );
      match.filled_count = filledAfter;
      match.status = nextOpenOrFull(match, filledAfter);

      await client.query('COMMIT');
      return {
        message: 'Participant kicked',
        request: toPublicJoinRequest(updated, guests),
        match: await loadMatchView(client, match, callerId, {
          includeHostPhone: true,
        }),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}

function throwPitchBusy(row) {
  throw new AppError(
    'This pitch is already booked at an overlapping time',
    409,
    {
      matchId: row.match_id,
      hostUserId: row.host_user_id,
      title: row.title,
      venueName: row.venue_name,
      venueAddress: row.venue_address,
      courtName: row.court_name,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
    },
  );
}

function rowToCreateInput(match, courts) {
  return {
    sport: match.sport,
    format: match.format,
    title: match.title,
    notes: match.notes,
    coverUrl: match.cover_url ?? null,
    venueName: match.venue_name,
    venueAddress: match.venue_address,
    province: match.province,
    city: match.city,
    latitude: match.venue_lat == null ? undefined : Number(match.venue_lat),
    longitude: match.venue_lng == null ? undefined : Number(match.venue_lng),
    startsAt: match.starts_at,
    endsAt: match.ends_at,
    isMultiDay: Boolean(match.is_multi_day),
    isRecurring: Boolean(match.is_recurring),
    maxPlayers: Number(match.max_players),
    allLevels: Boolean(match.all_levels),
    skillMin: match.skill_min,
    skillMax: match.skill_max,
    feeType: match.fee_type,
    priceMin: match.price_min,
    priceMax: match.price_max ?? undefined,
    joinMode: match.join_mode,
    courts: courts.map((court) => ({ name: court.name })),
  };
}

function mergePatch(base, patch) {
  const next = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      next[key] = value;
    }
  }
  return next;
}

function assertHost(match, callerId) {
  if (!match) {
    throw new AppError('Match not found', 404);
  }
  if (callerId !== Number(match.host_user_id)) {
    throw new AppError('Only the host can manage this match', 403);
  }
}

function expiredUnderfilledNotificationCopy(match) {
  const filledCount = Number(match.filled_count);
  const maxPlayers = Number(match.max_players);
  return {
    title: 'Kèo đã bị hủy',
    body: `Kèo "${match.title}" đã bị hủy vì hết hạn mà chưa đủ người (${filledCount}/${maxPlayers}).`,
    data: {
      matchId: match.match_id,
      outcome: 'CANCELLED',
      reason: 'EXPIRED_UNDERFILLED',
      filledCount,
      maxPlayers,
    },
  };
}

async function notifyExpiredUnderfilledMatch(match, participantUserIds = []) {
  const copy = expiredUnderfilledNotificationCopy(match);
  const recipientIds = new Set([
    Number(match.host_user_id),
    ...participantUserIds.map(Number),
  ]);

  for (const userId of recipientIds) {
    await createNotification({
      userId,
      type: NOTIFICATION_TYPES.MATCH_CANCELLED,
      title: copy.title,
      body: copy.body,
      data: copy.data,
      sendEmail: false,
    });
  }
}

function cancelledMatchNotificationCopy(match) {
  return {
    title: 'Kèo đã bị hủy',
    body: `Host đã hủy kèo "${match.title}".`,
    data: {
      matchId: match.match_id,
      outcome: 'CANCELLED',
      reason: 'HOST_CANCEL',
    },
  };
}

async function notifyMatchCancelled(match, joinerUserIds = []) {
  const copy = cancelledMatchNotificationCopy(match);
  const hostId = Number(match.host_user_id);
  const recipientIds = new Set(
    joinerUserIds.map(Number).filter((userId) => userId !== hostId),
  );

  for (const userId of recipientIds) {
    await createNotification({
      userId,
      type: NOTIFICATION_TYPES.MATCH_CANCELLED,
      title: copy.title,
      body: copy.body,
      data: copy.data,
      sendEmail: false,
    });
  }
}

/**
 * Close expired kèo đủ người → COMPLETED (tab Completed + nhả sân).
 * Idempotent — only OPEN/FULL with ends_at <= now and filled_count >= max_players.
 */
export async function processExpiredFullMatches({ limit = 50 } = {}) {
  const client = await pool.connect();
  const results = { processed: 0, matchIds: [] };
  try {
    const matchIds = await matchRepository.listExpiredFullIds(client, { limit });

    for (const matchId of matchIds) {
      const tx = await pool.connect();
      try {
        await tx.query('BEGIN');
        const match = await matchRepository.lockById(tx, matchId);
        if (
          !match ||
          !PITCH_OCCUPIED_STATUSES.includes(match.status) ||
          new Date(match.ends_at).getTime() > Date.now() ||
          Number(match.filled_count) < Number(match.max_players)
        ) {
          await tx.query('ROLLBACK');
          continue;
        }

        await matchRepository.updateStatus(
          tx,
          matchId,
          MATCH_STATUSES.COMPLETED,
        );
        await tx.query('COMMIT');
        results.processed += 1;
        results.matchIds.push(matchId);
      } catch (err) {
        await tx.query('ROLLBACK');
        throw err;
      } finally {
        tx.release();
      }
    }

    return results;
  } finally {
    client.release();
  }
}

/**
 * Auto-cancel expired kèo thiếu người → CANCELLED + inbox (không phải COMPLETED).
 * Idempotent — only OPEN/FULL rows with ends_at <= now and filled_count < max_players.
 */
export async function processExpiredUnderfilledMatches({ limit = 50 } = {}) {
  const client = await pool.connect();
  const results = { processed: 0, matchIds: [] };
  try {
    const matchIds = await matchRepository.listExpiredUnderfilledIds(client, {
      limit,
    });

    for (const matchId of matchIds) {
      const tx = await pool.connect();
      try {
        await tx.query('BEGIN');
        const match = await matchRepository.lockById(tx, matchId);
        if (
          !match ||
          !PITCH_OCCUPIED_STATUSES.includes(match.status) ||
          new Date(match.ends_at).getTime() > Date.now() ||
          Number(match.filled_count) >= Number(match.max_players)
        ) {
          await tx.query('ROLLBACK');
          continue;
        }

        const joinerUserIds =
          await joinRequestRepository.listJoinerUserIdsToNotify(tx, matchId);
        await joinRequestRepository.rejectPendingByMatchId(tx, matchId);
        await matchRepository.updateStatus(
          tx,
          matchId,
          MATCH_STATUSES.CANCELLED,
        );
        await tx.query('COMMIT');

        await notifyExpiredUnderfilledMatch(match, joinerUserIds);
        results.processed += 1;
        results.matchIds.push(matchId);
      } catch (err) {
        await tx.query('ROLLBACK');
        throw err;
      } finally {
        tx.release();
      }
    }

    return results;
  } finally {
    client.release();
  }
}

async function processExpiredMatches() {
  await processExpiredFullMatches({ limit: 50 });
  await processExpiredUnderfilledMatches({ limit: 50 });
}

export async function listMine(userId, query) {
  const callerId = callerUserId(userId);
  await processExpiredMatches();
  const client = await pool.connect();
  try {
    const gender = await callerGender(client, callerId);
    const filters = {
      userId: callerId,
      tab: query.tab,
      limit: query.limit,
      offset: query.offset,
    };
    const rows = await matchRepository.listMine(client, filters);
    const total = await matchRepository.countMine(client, filters);
    const matchIds = rows.map((row) => row.match_id);
    const courtRows = await matchCourtRepository.findByMatchIds(
      client,
      matchIds,
    );
    const avatarsByMatch = await matchRepository.listPreviewAvatars(
      client,
      matchIds,
    );
    const courtsByMatch = new Map();
    for (const court of courtRows) {
      const list = courtsByMatch.get(court.match_id) || [];
      list.push(court);
      courtsByMatch.set(court.match_id, list);
    }
    const hostRatingMap = await loadHostRatingMap(client, rows);
    return {
      tab: query.tab,
      total,
      limit: query.limit,
      offset: query.offset,
      matches: rows.map((row) =>
        attachMatchOutcome(
          {
            ...toPublicMatch(row, courtsByMatch.get(row.match_id) || [], {
              gender,
              participantAvatars: avatarsByMatch.get(row.match_id) || [],
              hostRating: hostRatingMap.get(Number(row.host_user_id)) ?? null,
            }),
            myRole: row.my_role,
            myRequestStatus: row.my_request_status ?? null,
            pendingRequestCount:
              row.my_role === MY_MATCH_ROLES.HOST
                ? Number(row.pending_request_count ?? 0)
                : 0,
          },
          row,
        ),
      ),
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
    const rows = await joinRequestRepository.listMyJoinRequests(
      client,
      filters,
    );
    const total = await joinRequestRepository.countMyJoinRequests(
      client,
      filters,
    );
    const pendingCount =
      await joinRequestRepository.countMyPendingJoinRequests(client, callerId);
    return {
      total,
      pendingCount,
      limit: query.limit,
      offset: query.offset,
      requests: rows.map((row) => ({
        requestId: row.request_id,
        status: row.status,
        message: row.message ?? null,
        heads: Number(row.heads),
        skillWarning: Boolean(row.skill_warning),
        shareAmount: row.share_amount ?? null,
        paymentStatus: row.payment_status ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        match: {
          matchId: row.match_id,
          title: row.match_title,
          sport: row.match_sport,
          joinMode: row.match_join_mode,
          startsAt: row.match_starts_at,
          endsAt: row.match_ends_at,
          venueName: row.match_venue_name,
          venueAddress: row.match_venue_address,
          status: row.match_status,
          hostFullName: row.host_full_name ?? undefined,
          hostAvatarUrl: row.host_avatar_url ?? null,
        },
      })),
    };
  } finally {
    client.release();
  }
}

export async function updateMatch(userId, rawId, patch) {
  const matchId = parseMatchId(rawId);
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const match = await matchRepository.lockById(client, matchId);
      assertHost(match, callerId);
      if (
        match.status === MATCH_STATUSES.CANCELLED ||
        match.status === MATCH_STATUSES.COMPLETED
      ) {
        throw new AppError(`Match is ${match.status.toLowerCase()}`, 400);
      }
      if (new Date(match.starts_at).getTime() <= Date.now()) {
        throw new AppError('Cannot edit a match that has already started', 400);
      }

      const filledCount = Number(match.filled_count);
      if (filledCount > 1) {
        const sportChanged = patch.sport != null && patch.sport !== match.sport;
        const formatChanged =
          patch.format != null && patch.format !== match.format;
        const feeChanged =
          (patch.feeType != null && patch.feeType !== match.fee_type) ||
          (patch.priceMin != null && patch.priceMin !== Number(match.price_min)) ||
          (patch.priceMax != null && patch.priceMax !== Number(match.price_max));
        if (sportChanged || formatChanged || feeChanged) {
          throw new AppError(
            'Cannot change sport, format, or fee after players have joined',
            400,
          );
        }
      }

      const existingCourts = await matchCourtRepository.findByMatchId(
        client,
        matchId,
      );
      const merged = mergePatch(rowToCreateInput(match, existingCourts), patch);
      const parsed = parseCreateMatchDto(merged);
      if (parsed.maxPlayers < filledCount) {
        throw new AppError('maxPlayers cannot be less than filledCount', 400, {
          filledCount,
          maxPlayers: parsed.maxPlayers,
        });
      }

      const skills = resolveSkillRange(parsed);
      const courts = buildCourts(parsed);
      const courtNames = courts.map((court) => normalizeCourtName(court.name));
      const feeType = parsed.feeType;
      const priceMin = parsed.priceMin;
      const priceMax = feeType === FEE_TYPES.GENDER_RANGE ? parsed.priceMax : null;

      await matchRepository.lockPitches(
        client,
        courts.map((court) =>
          pitchKey(parsed.venueName, parsed.venueAddress, court.name),
        ),
      );
      const overlapRows = await matchRepository.findPitchOverlaps(client, {
        venueName: parsed.venueName,
        venueAddress: parsed.venueAddress,
        startsAt: parsed.startsAt,
        endsAt: parsed.endsAt,
        courtNames,
        excludeMatchId: matchId,
      });
      if (overlapRows.length) {
        throwPitchBusy(overlapRows[0]);
      }

      const status = nextOpenOrFull(
        { ...match, max_players: parsed.maxPlayers },
        filledCount,
      );
      const updated = await matchRepository.updateMatch(client, matchId, {
        sport: parsed.sport,
        format: parsed.format,
        title: parsed.title,
        notes: parsed.notes || null,
        venueName: parsed.venueName,
        venueAddress: parsed.venueAddress,
        province: parsed.province,
        city: parsed.city,
        latitude: parsed.latitude ?? null,
        longitude: parsed.longitude ?? null,
        startsAt: parsed.startsAt,
        endsAt: parsed.endsAt,
        isMultiDay: Boolean(parsed.isMultiDay),
        isRecurring: Boolean(parsed.isRecurring),
        maxPlayers: parsed.maxPlayers,
        skillMin: skills.skillMin,
        skillMax: skills.skillMax,
        skillMinRank: skills.skillMinRank,
        skillMaxRank: skills.skillMaxRank,
        allLevels: skills.allLevels,
        feeType,
        priceMin,
        priceMax,
        joinMode: parsed.joinMode,
        status,
        coverUrl: parsed.coverUrl ?? null,
      });
      updated.filled_count = filledCount;
      updated.host_full_name = match.host_full_name;
      updated.host_phone_number = match.host_phone_number;
      updated.host_avatar_url = match.host_avatar_url;
      updated.host_match_count = match.host_match_count;
      updated.is_favorited = match.is_favorited;

      let courtRows = existingCourts;
      if (patch.courts) {
        await matchCourtRepository.deleteByMatchId(client, matchId);
        courtRows = await matchCourtRepository.insertCourts(
          client,
          matchId,
          courts,
        );
      }

      await client.query('COMMIT');
      const gender = await callerGender(client, callerId);
      updated.is_favorited = await matchFavoriteRepository.exists(
        client,
        callerId,
        matchId,
      );
      const avatarsByMatch = await matchRepository.listPreviewAvatars(client, [
        matchId,
      ]);
      return {
        message: 'Match updated',
        match: toPublicMatch(updated, courtRows, {
          gender,
          includeHostPhone: true,
          participantAvatars: avatarsByMatch.get(matchId) || [],
        }),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}

export async function cancelMatch(userId, rawId) {
  const matchId = parseMatchId(rawId);
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const match = await matchRepository.lockById(client, matchId);
      assertHost(match, callerId);
      if (match.status === MATCH_STATUSES.CANCELLED) {
        throw new AppError('Match is already cancelled', 400);
      }
      if (match.status === MATCH_STATUSES.COMPLETED) {
        throw new AppError('Match is completed', 400);
      }

      const joinerUserIds =
        await joinRequestRepository.listJoinerUserIdsToNotify(client, matchId);
      await joinRequestRepository.rejectPendingByMatchId(client, matchId);
      await matchRepository.updateStatus(
        client,
        matchId,
        MATCH_STATUSES.CANCELLED,
      );
      match.status = MATCH_STATUSES.CANCELLED;
      await client.query('COMMIT');
      await notifyMatchCancelled(match, joinerUserIds);
      return {
        message: 'Match cancelled',
        match: await loadMatchView(client, match, callerId, {
          includeHostPhone: true,
        }),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}

export async function favoriteMatch(userId, rawId) {
  return setFavorite(userId, rawId, true);
}

export async function unfavoriteMatch(userId, rawId) {
  return setFavorite(userId, rawId, false);
}

async function setFavorite(userId, rawId, favorited) {
  const matchId = parseMatchId(rawId);
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    const match = await matchRepository.findById(client, matchId, callerId);
    if (!match) {
      throw new AppError('Match not found', 404);
    }
    if (favorited) {
      await matchFavoriteRepository.add(client, callerId, matchId);
    } else {
      await matchFavoriteRepository.remove(client, callerId, matchId);
    }
    const courts = await matchCourtRepository.findByMatchId(client, matchId);
    const gender = await callerGender(client, callerId);
    const avatarsByMatch = await matchRepository.listPreviewAvatars(client, [
      matchId,
    ]);
    match.is_favorited = favorited;
    return {
      message: favorited ? 'Match favorited' : 'Match unfavorited',
      isFavorited: favorited,
      match: toPublicMatch(match, courts, {
        gender,
        participantAvatars: avatarsByMatch.get(matchId) || [],
      }),
    };
  } finally {
    client.release();
  }
}
