import pool from '../../../shared/database/pool.js';
import { AppError } from '../../../shared/middleware/errorHandler.js';
import { EXCLUSION_VIOLATION_CODE } from '../../../shared/constants/booking.js';
import { FIELD_STATUSES } from '../../../shared/constants/owner.js';
import { formatTimeInZone } from '../../booking/entity/booking.entity.js';
import * as facilityRepository from '../repository/facility.repository.js';
import * as scheduleRepository from '../repository/schedule.repository.js';
import { toScheduleBooking } from '../entity/owner.entity.js';

const SLOT_DURATION_MINUTES = 30;

function parseMinutes(value) {
  if (!value) return null;
  const [h, m] = String(value).split(':');
  const hour = Number(h);
  const minute = Number(m ?? 0);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function formatMinutes(totalMinutes) {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function buildFieldSlots(field, bookingsForField) {
  if (field.status === FIELD_STATUSES.MAINTENANCE || field.status === FIELD_STATUSES.INACTIVE) {
    return [];
  }

  const bookedIntervals = bookingsForField.map((b) => ({
    startTime: formatTimeInZone(b.starts_at),
    endTime: formatTimeInZone(b.ends_at),
    booking: b,
  }));

  const openMinutes = parseMinutes(field.opening_hours);
  const closeMinutes = parseMinutes(field.closing_hours);
  if (openMinutes == null || closeMinutes == null || closeMinutes <= openMinutes) {
    return [];
  }

  const slots = [];
  for (
    let start = openMinutes;
    start + SLOT_DURATION_MINUTES <= closeMinutes;
    start += SLOT_DURATION_MINUTES
  ) {
    const end = start + SLOT_DURATION_MINUTES;
    const overlapping = bookedIntervals.find(
      (b) => parseMinutes(b.startTime) < end && parseMinutes(b.endTime) > start,
    );

    if (!overlapping) {
      slots.push({
        startTime: formatMinutes(start),
        endTime: formatMinutes(end),
        state: 'AVAILABLE',
      });
      continue;
    }

    slots.push({
      startTime: formatMinutes(start),
      endTime: formatMinutes(end),
      state: overlapping.booking.status === 'PENDING_PAYMENT' ? 'UNPAID' : 'BOOKED',
      ...toScheduleBooking(overlapping.booking),
    });
  }
  return slots;
}

async function loadOwnedVenue(client, ownerId, venueId) {
  const venue = await facilityRepository.findVenueForOwner(client, venueId, ownerId);
  if (!venue) {
    throw new AppError('Venue not found', 404);
  }
  return venue;
}

export async function getSchedule(ownerId, query) {
  const client = await pool.connect();
  try {
    const venue = await loadOwnedVenue(client, ownerId, query.venueId);
    let fields = await facilityRepository.listFieldsForVenue(client, query.venueId);
    if (query.sport) {
      fields = fields.filter((f) => f.sport_type === query.sport);
    }

    const fieldIds = fields.map((f) => f.field_id);
    const bookings = await scheduleRepository.listBookingsForFieldsOnDate(
      client,
      fieldIds,
      query.date,
    );
    const bookingsByField = new Map();
    for (const booking of bookings) {
      const list = bookingsByField.get(booking.field_id) ?? [];
      list.push(booking);
      bookingsByField.set(booking.field_id, list);
    }

    return {
      venueId: venue.venue_id,
      date: query.date,
      fields: fields.map((field) => ({
        fieldId: field.field_id,
        name: field.name,
        sportType: field.sport_type,
        status: field.status,
        slots: buildFieldSlots(
          {
            status: field.status,
            opening_hours: venue.opening_hours,
            closing_hours: venue.closing_hours,
          },
          bookingsByField.get(field.field_id) ?? [],
        ),
      })),
    };
  } finally {
    client.release();
  }
}

export async function createManualBooking(ownerId, dto) {
  const client = await pool.connect();
  try {
    const field = await scheduleRepository.findFieldForOwnerByFieldId(
      client,
      dto.fieldId,
      ownerId,
    );
    if (!field) {
      throw new AppError('Field not found', 404);
    }
    if (field.status !== FIELD_STATUSES.ACTIVE) {
      throw new AppError('Field is not available for booking', 422);
    }

    const rangeStart = new Date(`${dto.bookingDate}T${dto.startTime}:00+07:00`);
    const rangeEnd = new Date(`${dto.bookingDate}T${dto.endTime}:00+07:00`);

    let booking;
    try {
      booking = await scheduleRepository.insertManualBooking(client, {
        ownerId,
        fieldId: dto.fieldId,
        bookingDate: dto.bookingDate,
        timeRange: { start: rangeStart, end: rangeEnd },
        totalAmount: dto.totalAmount,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        status: dto.markPaid ? 'PAID' : 'PENDING_PAYMENT',
      });
    } catch (err) {
      if (err.code === EXCLUSION_VIOLATION_CODE) {
        throw new AppError('This slot is no longer available', 409);
      }
      throw err;
    }

    return toScheduleBooking(booking);
  } finally {
    client.release();
  }
}

export async function cancelBooking(ownerId, bookingId) {
  const client = await pool.connect();
  try {
    const owned = await scheduleRepository.findBookingForOwner(client, bookingId, ownerId);
    if (!owned) {
      throw new AppError('Booking not found', 404);
    }
    const booking = await scheduleRepository.cancelBooking(client, bookingId);
    return toScheduleBooking(booking);
  } finally {
    client.release();
  }
}
