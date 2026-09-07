import pool from '../../../shared/database/pool.js';
import {
  SCHEDULE_TIMEZONE,
  SCHEDULE_DEFAULT_DAYS,
  SCHEDULE_ITEM_TYPES,
} from '../../../shared/constants/schedule.js';
import { AppError } from '../../../shared/middleware/errorHandler.js';
import {
  BOOKING_DEPOSIT_PERCENTAGE,
  EXCLUSION_VIOLATION_CODE,
} from '../../../shared/constants/booking.js';
import { DEFAULT_REFEREE_FEE_VND } from '../../../shared/constants/referee.js';
import * as scheduleRepository from '../repository/schedule.repository.js';
import * as bookingRepository from '../repository/booking.repository.js';
import * as venueRepository from '../../venue/repository/venue.repository.js';
import { fanOutRefereeInvitations, dispatchInvitationNotifications } from '../../referee/service/assignment-fanout.service.js';
import * as notificationService from '../../notification/service/notification.service.js';
import { NOTIFICATION_TYPES } from '../../../shared/constants/notification.js';
import logger from '../../../shared/utils/logger.js';
import {
  toPublicScheduleItem,
} from '../entity/schedule.entity.js';
import {
  buildAvailabilitySlots,
  formatTimeInZone,
  toPublicBooking,
} from '../entity/booking.entity.js';

/** YYYY-MM-DD for "today" in Asia/Bangkok. */
export function todayInBangkok(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SCHEDULE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Add calendar days to a YYYY-MM-DD string (UTC noon trick avoids DST issues). */
export function addCalendarDays(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Inclusive Bangkok calendar days → half-open UTC timestamptz window [start, end).
 */
export function bangkokRangeToUtc(fromDate, toDate) {
  const rangeStart = new Date(`${fromDate}T00:00:00+07:00`);
  const endExclusiveDate = addCalendarDays(toDate, 1);
  const rangeEnd = new Date(`${endExclusiveDate}T00:00:00+07:00`);
  return { rangeStart, rangeEnd };
}

function resolveDateWindow(query) {
  const from = query.from ?? todayInBangkok();
  const to = query.to ?? addCalendarDays(from, SCHEDULE_DEFAULT_DAYS);
  return bangkokRangeToUtc(from, to);
}

export async function listMySchedule(userId, query) {
  const { rangeStart, rangeEnd } = resolveDateWindow(query);
  const client = await pool.connect();
  try {
    const rows = await scheduleRepository.listScheduleForUser(client, userId, {
      type: query.type ?? SCHEDULE_ITEM_TYPES.ALL,
      rangeStart,
      rangeEnd,
      limit: query.limit,
    });
    return {
      items: rows.map(toPublicScheduleItem),
      timezone: SCHEDULE_TIMEZONE,
    };
  } finally {
    client.release();
  }
}

export async function getProfileStats(userId) {
  const client = await pool.connect();
  try {
    return scheduleRepository.getProfileStatsForUser(client, userId);
  } finally {
    client.release();
  }
}

/**
 * Dev/smoke: create venue + field + booking (+ optional match) for the user.
 * Uses the user as both owner and player (fine for local seed).
 */
export async function seedScheduleForUser(userId, input = {}) {
  const includeMatch = input.includeMatch !== false;
  const daysFromNow = input.daysFromNow ?? 3;

  const bookingDate = addCalendarDays(todayInBangkok(), daysFromNow);
  const rangeStart = new Date(`${bookingDate}T18:00:00+07:00`);
  const rangeEnd = new Date(`${bookingDate}T19:00:00+07:00`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const venue = await scheduleRepository.insertVenue(client, {
      ownerId: userId,
      name: `Smoke Venue ${Date.now()}`,
      address: '123 Nguyen Van Linh, Quan 7, HCMC',
      openingHours: '00:00',
      closingHours: '23:59',
      province: '79',
      city: '778',
      latitude: 10.729,
      longitude: 106.721,
    });

    // Sample gallery photos — placeholder images (Lorem Picsum), not real
    // venue photos; no photo-upload flow exists yet (Venue Owner out of scope).
    await scheduleRepository.insertVenueImage(client, {
      venueId: venue.venue_id,
      imageUrl: `https://picsum.photos/seed/venue-${venue.venue_id}-1/800/600`,
      displayOrder: 0,
    });
    await scheduleRepository.insertVenueImage(client, {
      venueId: venue.venue_id,
      imageUrl: `https://picsum.photos/seed/venue-${venue.venue_id}-2/800/600`,
      displayOrder: 1,
    });

    const field = await scheduleRepository.insertField(client, {
      venueId: venue.venue_id,
      name: 'Pitch A',
      sportType: 'Football',
      pricePerHour: 300000,
    });

    const booking = await scheduleRepository.insertBooking(client, {
      playerId: userId,
      fieldId: field.field_id,
      bookingDate,
      rangeStart,
      rangeEnd,
      totalAmount: 300000,
      depositAmount: 100000,
      status: 'PAID',
    });

    let match = null;
    if (includeMatch) {
      match = await scheduleRepository.insertMatch(client, {
        hostId: userId,
        bookingId: booking.booking_id,
        sportType: 'Football',
        maxPlayers: 10,
        pricePerPlayer: 50000,
      });
    }

    await client.query('COMMIT');

    return {
      venue: {
        venueId: venue.venue_id,
        name: venue.name,
        address: venue.address,
      },
      field: {
        fieldId: field.field_id,
        name: field.name,
        sportType: field.sport_type,
      },
      booking: {
        bookingId: booking.booking_id,
        bookingDate: booking.booking_date,
        status: booking.status,
        startsAt: booking.starts_at,
        endsAt: booking.ends_at,
      },
      match: match
        ? {
            matchId: match.match_id,
            bookingId: match.booking_id,
            sportType: match.sport_type,
          }
        : null,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getFieldAvailability(venueId, fieldId, date) {
  const client = await pool.connect();
  try {
    const venue = await venueRepository.findVenueById(client, venueId);
    if (!venue) {
      throw new AppError('Venue not found', 404);
    }

    const fields = await venueRepository.listFieldsByVenueId(client, venueId);
    const field = fields.find((f) => f.field_id === Number(fieldId));
    if (!field) {
      throw new AppError('Field not found', 404);
    }

    const bookedRows = await bookingRepository.listBookedRangesForFieldOnDate(
      client,
      field.field_id,
      date,
    );
    const bookedRanges = bookedRows.map((row) => ({
      startTime: formatTimeInZone(row.starts_at),
      endTime: formatTimeInZone(row.ends_at),
    }));

    const slots = buildAvailabilitySlots(
      venue.opening_hours,
      venue.closing_hours,
      bookedRanges,
    );

    return { fieldId: field.field_id, date, slots };
  } finally {
    client.release();
  }
}

export async function createBooking(playerId, dto) {
  const client = await pool.connect();
  try {
    const field = await bookingRepository.findFieldWithVenueForBooking(
      client,
      dto.fieldId,
    );
    if (!field) {
      throw new AppError('Field not found', 404);
    }
    if (field.field_status !== 'ACTIVE') {
      throw new AppError('Field is not available for booking', 409);
    }

    const openingHours = field.opening_hours
      ? String(field.opening_hours).slice(0, 5)
      : null;
    const closingHours = field.closing_hours
      ? String(field.closing_hours).slice(0, 5)
      : null;
    if (
      !openingHours ||
      !closingHours ||
      dto.startTime < openingHours ||
      dto.endTime > closingHours
    ) {
      throw new AppError(
        "Requested time is outside the venue's opening hours",
        409,
      );
    }

    const rangeStart = new Date(`${dto.bookingDate}T${dto.startTime}:00+07:00`);
    const rangeEnd = new Date(`${dto.bookingDate}T${dto.endTime}:00+07:00`);
    const durationHours = (rangeEnd - rangeStart) / (1000 * 60 * 60);
    const totalAmount =
      Math.round(Number(field.price_per_hour) * durationHours * 100) / 100;
    const depositAmount =
      Math.round(totalAmount * BOOKING_DEPOSIT_PERCENTAGE * 100) / 100;

    let booking;
    try {
      booking = await bookingRepository.insertBooking(client, {
        playerId,
        fieldId: dto.fieldId,
        bookingDate: dto.bookingDate,
        timeRange: { start: rangeStart, end: rangeEnd },
        totalAmount,
        depositAmount,
        hireReferee: dto.hireReferee,
        refereeFeeVnd: dto.hireReferee
          ? (dto.refereeFeeVnd ?? DEFAULT_REFEREE_FEE_VND)
          : null,
      });
    } catch (err) {
      if (err.code === EXCLUSION_VIOLATION_CODE) {
        throw new AppError(
          'This field is already booked for the requested time',
          409,
        );
      }
      throw err;
    }

    notifyOwnerOfNewBooking(field, booking, rangeStart).catch((err) => {
      logger.warn('Owner booking-created notification failed', {
        error: err.message,
        bookingId: booking.booking_id,
      });
    });

    notifyPlayerOfNewBooking(playerId, field, booking, rangeStart).catch((err) => {
      logger.warn('Player booking-created notification failed', {
        error: err.message,
        bookingId: booking.booking_id,
      });
    });

    return toPublicBooking(booking);
  } finally {
    client.release();
  }
}

/**
 * Best-effort: tells the venue owner a customer just booked one of their
 * fields, and schedules the owner's own T-24h/T-2h "match starting soon"
 * reminders (separate from the player's own reminders on the same booking).
 */
async function notifyOwnerOfNewBooking(field, booking, startAt) {
  await notificationService.createNotification({
    userId: field.owner_id,
    type: NOTIFICATION_TYPES.OWNER_BOOKING_CREATED,
    title: 'New booking',
    body: `${field.field_name} at ${field.venue_name} was just booked for ${booking.booking_date}.`,
    data: { bookingId: booking.booking_id, fieldId: field.field_id },
  });
  await notificationService.scheduleBookingReminders({
    userId: field.owner_id,
    bookingId: booking.booking_id,
    startAt,
    audience: 'OWNER',
  });
}

/**
 * Best-effort: confirms to the player their booking was created, and
 * schedules the player's own T-24h/T-2h "booking starting soon" reminders
 * (separate from the owner's reminders on the same booking).
 */
async function notifyPlayerOfNewBooking(playerId, field, booking, startAt) {
  await notificationService.createNotification({
    userId: playerId,
    type: NOTIFICATION_TYPES.BOOKING_CREATED,
    title: 'Booking confirmed',
    body: `Your booking for ${field.field_name} at ${field.venue_name} on ${booking.booking_date} is confirmed.`,
    data: { bookingId: booking.booking_id, fieldId: field.field_id },
  });
  await notificationService.scheduleBookingReminders({
    userId: playerId,
    bookingId: booking.booking_id,
    startAt,
    audience: 'PLAYER',
  });
}

/**
 * Book multiple field/time slots in one request (multi-pitch and/or
 * multi-slot). Each item is created independently — one conflict doesn't
 * roll back the others, mirroring matchmaking's POST /matches/bulk.
 */
export async function createBookingsBulk(playerId, { bookings }) {
  const created = [];
  const failed = [];

  for (const item of bookings) {
    try {
      const booking = await createBooking(playerId, item);
      created.push(booking);
    } catch (err) {
      if (err instanceof AppError) {
        failed.push({
          fieldId: item.fieldId,
          bookingDate: item.bookingDate,
          startTime: item.startTime,
          endTime: item.endTime,
          message: err.message,
        });
        continue;
      }
      throw err;
    }
  }

  if (!created.length && failed.length) {
    throw new AppError('No bookings were created', 409, {
      failed,
      totalRequested: bookings.length,
      totalCreated: 0,
    });
  }

  return {
    message:
      created.length === bookings.length
        ? 'Bookings created'
        : 'Some bookings were created',
    totalRequested: bookings.length,
    totalCreated: created.length,
    created,
    failed,
  };
}

/** Mark booking PAID with booking code — used by payment confirm flow. */
export async function confirmBookingPaidAfterPayment(client, { bookingId, playerId, bookingCode }) {
  return bookingRepository.markBookingPaidWithCode(
    client,
    bookingId,
    playerId,
    bookingCode,
  );
}

/** Post-commit side effects after booking is PAID (referee fan-out). */
export async function runPostPaidSideEffects(booking, bookingId) {
  if (!booking?.hire_referee) {
    return { created: 0, notificationsSent: 0 };
  }

  const client = await pool.connect();
  let fanOut = { created: 0, invitations: [] };
  try {
    fanOut = await fanOutRefereeInvitations(bookingId, client);
  } finally {
    client.release();
  }

  if (fanOut.invitations?.length) {
    await dispatchInvitationNotifications(
      fanOut.invitations,
      fanOut.meta,
      bookingId,
    );
    return {
      created: fanOut.created,
      notificationsSent: fanOut.invitations.length,
    };
  }

  return { created: fanOut.created, notificationsSent: 0 };
}

/** Dev/smoke: mark booking PAID and fan-out referee invitations if hire_referee. */
export async function markBookingPaidDev(playerId, bookingId) {
  const bookingCode = `SPOT-${String(bookingId).padStart(6, '0')}`;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const booking = await bookingRepository.markBookingPaidWithCode(
      client,
      bookingId,
      playerId,
      bookingCode,
    );
    if (!booking) {
      throw new AppError('Booking not found or not pending payment', 404);
    }

    let fanOut = { created: 0, notificationsSent: 0 };
    if (booking.hire_referee) {
      fanOut = await fanOutRefereeInvitations(bookingId, client);
    }

    await client.query('COMMIT');

    if (booking.hire_referee && fanOut.invitations?.length) {
      await dispatchInvitationNotifications(
        fanOut.invitations,
        fanOut.meta,
        bookingId,
      );
      fanOut.notificationsSent = fanOut.invitations.length;
    }

    return {
      message: 'Booking marked as PAID',
      booking: toPublicBooking(booking),
      refereeInvitations: {
        created: fanOut.created,
        notificationsSent: fanOut.notificationsSent ?? fanOut.invitations?.length ?? 0,
      },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
