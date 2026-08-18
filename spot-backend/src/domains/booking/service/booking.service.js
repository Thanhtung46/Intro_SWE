import pool from '../../../shared/database/pool.js';
import {
  SCHEDULE_TIMEZONE,
  SCHEDULE_DEFAULT_DAYS,
  SCHEDULE_ITEM_TYPES,
} from '../../../shared/constants/schedule.js';
import * as scheduleRepository from '../repository/schedule.repository.js';
import { toPublicScheduleItem } from '../entity/schedule.entity.js';

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
      address: '123 Nguyen Trai, Dist 1, HCMC',
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
