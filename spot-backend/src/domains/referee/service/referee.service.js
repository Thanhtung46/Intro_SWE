import pool from '../../../shared/database/pool.js';
import { AppError } from '../../../shared/middleware/errorHandler.js';
import { SCHEDULE_TIMEZONE } from '../../../shared/constants/schedule.js';
import {
  REFEREE_INVITATION_TABS,
  REFEREE_SIGNUP_DOCUMENT_KINDS,
} from '../../../shared/constants/referee.js';
import * as userRepository from '../../auth/repository/user.repository.js';
import * as venueRepository from '../../venue/repository/venue.repository.js';
import * as verificationRepository from '../../admin/repository/verification-request.repository.js';
import * as profileRepository from '../repository/referee-profile.repository.js';
import * as venueRegistrationRepository from '../repository/venue-registration.repository.js';
import * as assignmentRepository from '../repository/assignment.repository.js';
import {
  scheduleRefereeRatingPrompt,
  sendRefereeRatingPromptNow,
} from './referee-rating-schedule.service.js';
import {
  toPublicRefereeProfile,
  toPublicVenueRegistration,
  toPublicBoardVenue,
  toPublicMatchInvitation,
  toPublicAssignmentDetail,
  toPublicScheduleItem,
  toPublicEarningsHistoryItem,
  toPublicCertification,
} from '../entity/referee.entity.js';
import {
  vnCityName,
  vnProvinceName,
} from '../../../shared/constants/vn-admin.js';
import * as venueFavoriteRepository from '../repository/venue-favorite.repository.js';

function monthWindow(monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  const monthStart = new Date(Date.UTC(year, month - 1, 1, -7, 0, 0));
  const monthEnd = new Date(Date.UTC(year, month, 1, -7, 0, 0));
  return { monthStart, monthEnd, monthStr: `${year}-${String(month).padStart(2, '0')}` };
}

function currentMonthInBangkok() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: SCHEDULE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}`;
}

function parseSinceDays(since) {
  const match = /^(\d+)d$/.exec(since ?? '30d');
  const days = match ? Number(match[1]) : 30;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function assertSportCertified(client, refereeId, sportType) {
  const profile = await profileRepository.findByUserId(client, refereeId);
  if (!profile) {
    throw new AppError('Referee profile not found', 404);
  }
  const certified = profile.certified_sport_types ?? [];
  if (!certified.includes(sportType)) {
    throw new AppError(
      `You are not certified for sport ${sportType}`,
      403,
      { certifiedSportTypes: certified },
    );
  }
  return profile;
}

export async function getRefereeMe(userId) {
  const client = await pool.connect();
  try {
    const user = await userRepository.findById(client, userId);
    if (!user) throw new AppError('User not found', 404);
    const profile = await profileRepository.findByUserId(client, userId);
    if (!profile) throw new AppError('Referee profile not found', 404);
    return {
      profile: toPublicRefereeProfile(profile, user),
    };
  } finally {
    client.release();
  }
}

export async function getCertifications(userId) {
  const client = await pool.connect();
  try {
    const rows = await verificationRepository.listByUserId(client, userId);
    return {
      certifications: rows.map(toPublicCertification),
    };
  } finally {
    client.release();
  }
}

export async function acknowledgeActivation(userId) {
  const client = await pool.connect();
  try {
    const row = await profileRepository.markActivationAck(client, userId);
    if (!row) throw new AppError('Referee profile not found', 404);
    return { activationAcknowledged: true };
  } finally {
    client.release();
  }
}

export async function getBoard(userId, query) {
  const client = await pool.connect();
  try {
    await assertSportCertified(client, userId, query.sport);
    const excludeVenueIds = await venueRegistrationRepository.listRegisteredVenueIds(
      client,
      userId,
      query.sport,
    );
    const offset = (query.page - 1) * query.limit;
    const rows = await venueRepository.listBoardVenuesForReferee(
      client,
      query.sport,
      {
        lat: query.lat,
        long: query.lng,
        radiusKm: query.radiusKm,
        province: query.province,
        city: query.city,
        q: query.q,
        favorited: query.favorited,
        refereeId: userId,
        excludeVenueIds,
        limit: query.limit,
        offset,
      },
    );
    return {
      sport: query.sport,
      venues: rows.map((row) =>
        toPublicBoardVenue({
          ...row,
          province_name: vnProvinceName(row.province),
          city_name: vnCityName(row.province, row.city),
        }),
      ),
      page: query.page,
      limit: query.limit,
    };
  } finally {
    client.release();
  }
}

export async function registerVenue(userId, venueId, dto) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await assertSportCertified(client, userId, dto.sportType);

    const venue = await venueRepository.findVenueById(client, venueId);
    if (!venue) throw new AppError('Venue not found', 404);

    const fields = await venueRepository.listFieldsByVenueId(client, venueId);
    const hasSport = fields.some(
      (f) => f.sport_type === dto.sportType && f.status === 'ACTIVE',
    );
    if (!hasSport) {
      throw new AppError('Venue has no active field for this sport', 409);
    }

    const existing = await venueRegistrationRepository.findActiveRegistration(client, {
      refereeId: userId,
      venueId,
      sportType: dto.sportType,
    });
    if (existing) {
      throw new AppError('Already registered for this venue and sport', 409);
    }

    const row = await venueRegistrationRepository.insertRegistration(client, {
      refereeId: userId,
      venueId,
      sportType: dto.sportType,
    });

    await client.query('COMMIT');

    const registrations = await venueRegistrationRepository.listActiveRegistrationsForReferee(
      client,
      userId,
    );
    const full = registrations.find((r) => r.registration_id === row.registration_id);

    return {
      message: 'Venue registration successful',
      registration: toPublicVenueRegistration(full ?? row),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function cancelVenueRegistration(userId, venueId, dto) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cancelled = await venueRegistrationRepository.cancelRegistration(client, {
      refereeId: userId,
      venueId,
      sportType: dto.sportType,
    });
    if (!cancelled) {
      throw new AppError('Active venue registration not found', 404);
    }

    await assignmentRepository.cancelPendingForRefereeAtVenue(client, userId, venueId);

    await client.query('COMMIT');

    return {
      message: 'Venue registration cancelled',
      registration: toPublicVenueRegistration(cancelled),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function favoriteVenue(userId, venueId) {
  const client = await pool.connect();
  try {
    const venue = await venueRepository.findVenueById(client, venueId);
    if (!venue) {
      throw new AppError('Venue not found', 404);
    }
    await venueFavoriteRepository.add(client, userId, venueId);
    return {
      message: 'Venue favorited',
      isFavorited: true,
    };
  } finally {
    client.release();
  }
}

export async function unfavoriteVenue(userId, venueId) {
  const client = await pool.connect();
  try {
    const venue = await venueRepository.findVenueById(client, venueId);
    if (!venue) {
      throw new AppError('Venue not found', 404);
    }
    await venueFavoriteRepository.remove(client, userId, venueId);
    return {
      message: 'Venue unfavorited',
      isFavorited: false,
    };
  } finally {
    client.release();
  }
}

export async function listVenueRegistrations(userId) {
  const client = await pool.connect();
  try {
    const rows = await venueRegistrationRepository.listActiveRegistrationsForReferee(
      client,
      userId,
    );
    return {
      registrations: rows.map(toPublicVenueRegistration),
    };
  } finally {
    client.release();
  }
}

export async function getInvitations(userId, query) {
  const client = await pool.connect();
  try {
    if (query.tab === REFEREE_INVITATION_TABS.PENDING) {
      const [matchInvitations, myVenues] = await Promise.all([
        assignmentRepository.listMatchInvitationsPending(client, userId),
        venueRegistrationRepository.listActiveRegistrationsForReferee(client, userId),
      ]);
      return {
        tab: query.tab,
        matchInvitations: matchInvitations.map(toPublicMatchInvitation),
        myVenues: myVenues.map(toPublicVenueRegistration),
      };
    }

    await assignmentRepository.syncPastAcceptedToCompleted(client, userId);

    if (query.tab === REFEREE_INVITATION_TABS.CONFIRMED) {
      const rows = await assignmentRepository.listConfirmed(client, userId);
      return {
        tab: query.tab,
        assignments: rows.map(toPublicMatchInvitation),
      };
    }

    const sinceDate = parseSinceDays(query.since);
    const rows = await assignmentRepository.listCompleted(client, userId, {
      sinceDate,
      filter: query.filter,
    });
    return {
      tab: query.tab,
      since: query.since,
      filter: query.filter,
      assignments: rows.map(toPublicMatchInvitation),
    };
  } finally {
    client.release();
  }
}

export async function getAssignmentDetail(userId, assignmentId) {
  const client = await pool.connect();
  try {
    const row = await assignmentRepository.findByIdForReferee(
      client,
      assignmentId,
      userId,
    );
    if (!row) throw new AppError('Assignment not found', 404);
    return { assignment: toPublicAssignmentDetail(row) };
  } finally {
    client.release();
  }
}

export async function acceptAssignment(userId, assignmentId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await assignmentRepository.acceptAssignment(
      client,
      assignmentId,
      userId,
    );
    if (result.error === 'NOT_FOUND') {
      throw new AppError('Assignment not found', 404);
    }
    if (result.error === 'INVALID_STATUS') {
      throw new AppError('Assignment is not pending', 409, { status: result.status });
    }
    if (result.error === 'ALREADY_TAKEN') {
      throw new AppError('Another referee has already accepted this match', 409, {
        code: 'ASSIGNMENT_ALREADY_TAKEN',
      });
    }
    await client.query('COMMIT');

    await scheduleRefereeRatingPrompt(assignmentId);

    const detail = await assignmentRepository.findByIdForReferee(
      client,
      assignmentId,
      userId,
    );
    return {
      message: 'Assignment accepted',
      assignment: toPublicAssignmentDetail(detail),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function declineAssignment(userId, assignmentId, dto) {
  const client = await pool.connect();
  try {
    const row = await assignmentRepository.declineAssignment(
      client,
      assignmentId,
      userId,
      dto.reason,
    );
    if (!row) throw new AppError('Pending assignment not found', 404);
    const detail = await assignmentRepository.findByIdForReferee(
      client,
      assignmentId,
      userId,
    );
    return {
      message: 'Assignment declined',
      assignment: toPublicAssignmentDetail(detail),
    };
  } finally {
    client.release();
  }
}

export async function getSchedule(userId, query) {
  const client = await pool.connect();
  try {
    const monthStr = query.month ?? currentMonthInBangkok();
    const { monthStart, monthEnd } = monthWindow(monthStr);

    await assignmentRepository.syncPastAcceptedToCompleted(client, userId);

    const monthStartDate = monthStart.toISOString().slice(0, 10);
    const monthEndDate = monthEnd.toISOString().slice(0, 10);

    const rows = await assignmentRepository.listScheduleForMonth(
      client,
      userId,
      monthStartDate,
      monthEndDate,
    );

    const confirmedDates = [...new Set(rows.map((r) => r.booking_date))];

    return {
      month: monthStr,
      timezone: SCHEDULE_TIMEZONE,
      confirmedDates,
      items: rows.map(toPublicScheduleItem),
    };
  } finally {
    client.release();
  }
}

export async function getEarnings(userId, query) {
  const client = await pool.connect();
  try {
    const monthStr = query.month ?? currentMonthInBangkok();
    const { monthStart, monthEnd } = monthWindow(monthStr);

    await assignmentRepository.syncPastAcceptedToCompleted(client, userId);

    const [summary, chartPoints] = await Promise.all([
      assignmentRepository.sumEarningsForMonth(client, userId, monthStart, monthEnd),
      assignmentRepository.earningsChartPoints(client, userId, monthStart, monthEnd),
    ]);

    return {
      month: monthStr,
      currency: 'VND',
      totalFeeVnd: Number(summary.total_fee),
      matchCount: summary.match_count,
      chartPoints: chartPoints.map((p) => ({
        day: p.day,
        amountVnd: Number(p.amount),
      })),
    };
  } finally {
    client.release();
  }
}

export async function getEarningsMonthly(userId, query) {
  const client = await pool.connect();
  try {
    const anchor = query.anchor ?? currentMonthInBangkok();
    const months = query.months ?? 6;

    const [ay, am] = anchor.split('-').map(Number);
    const startD = new Date(Date.UTC(ay, am - 1 - (months - 1), 1));
    const startStr = `${startD.getUTCFullYear()}-${String(startD.getUTCMonth() + 1).padStart(2, '0')}`;
    const { monthStart } = monthWindow(startStr);
    const { monthEnd } = monthWindow(anchor);

    await assignmentRepository.syncPastAcceptedToCompleted(client, userId);

    const rows = await assignmentRepository.earningsByMonth(client, userId, monthStart, monthEnd);

    return {
      anchor,
      months,
      currency: 'VND',
      buckets: rows.map((r) => ({
        key: r.key,
        amountVnd: Number(r.amount),
        matchCount: r.match_count,
      })),
    };
  } finally {
    client.release();
  }
}

export async function getEarningsHistory(userId, query) {
  const client = await pool.connect();
  try {
    await assignmentRepository.syncPastAcceptedToCompleted(client, userId);
    const window = query.month ? monthWindow(query.month) : {};
    const { rows, total } = await assignmentRepository.listEarningsHistory(client, userId, {
      limit: query.limit,
      offset: query.offset,
      monthStart: window.monthStart,
      monthEnd: window.monthEnd,
    });
    return {
      items: rows.map((row, idx) =>
        toPublicEarningsHistoryItem(row, idx, query.offset)),
      total,
      limit: query.limit,
      offset: query.offset,
      month: query.month ?? null,
    };
  } finally {
    client.release();
  }
}

export { REFEREE_SIGNUP_DOCUMENT_KINDS };

/** Dev/smoke: force assignment + booking to COMPLETED for referee review flow. */
export async function devCompleteAssignment(userId, assignmentId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const row = await assignmentRepository.findByIdForReferee(
      client,
      assignmentId,
      userId,
    );
    if (!row) throw new AppError('Assignment not found', 404);
    if (row.status !== 'ACCEPTED' && row.status !== 'COMPLETED') {
      throw new AppError('Only accepted assignments can be completed', 409);
    }

    await client.query(
      `UPDATE schema_booking.bookings
       SET status = 'COMPLETED',
           booking_time_range = tstzrange(
             LEAST(lower(booking_time_range), CURRENT_TIMESTAMP - interval '1 minute'),
             CURRENT_TIMESTAMP
           ),
           updated_at = CURRENT_TIMESTAMP
       WHERE booking_id = $1`,
      [row.booking_id],
    );

    await client.query(
      `UPDATE schema_referee.referee_assignments
       SET status = 'COMPLETED',
           completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)
       WHERE assignment_id = $1`,
      [assignmentId],
    );

    await client.query(
      `UPDATE schema_referee.referee_profiles
       SET total_matches_officiated = total_matches_officiated + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [userId],
    );

    await client.query('COMMIT');

    await sendRefereeRatingPromptNow(assignmentId);

    const detail = await assignmentRepository.findByIdForReferee(
      client,
      assignmentId,
      userId,
    );
    return {
      message: 'Assignment marked completed (dev)',
      assignment: toPublicAssignmentDetail(detail),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
