import { SCHEDULE_TIMEZONE } from '../../../shared/constants/schedule.js';

export function formatTimeInZone(date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: SCHEDULE_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(date));
}

export function toPublicBooking(row) {
  if (!row) return null;

  return {
    bookingId: row.booking_id,
    fieldId: row.field_id,
    bookingDate:
      typeof row.booking_date === 'string'
        ? row.booking_date.slice(0, 10)
        : row.booking_date,
    startTime: formatTimeInZone(row.starts_at),
    endTime: formatTimeInZone(row.ends_at),
    totalAmount: Number(row.total_amount),
    depositAmount: Number(row.deposit_amount),
    status: row.status,
  };
}

/** 'HH:MM' or 'HH:MM:SS' -> integer hour, or null if unparseable. */
function parseHour(value) {
  if (!value) return null;
  const hour = Number(value.split(':')[0]);
  return Number.isFinite(hour) ? hour : null;
}

function formatHour(hour) {
  return `${String(hour).padStart(2, '0')}:00`;
}

/**
 * Walks from openingHours to closingHours in 1-hour steps, marking a slot
 * unavailable when it overlaps any booked range — per data-model.md
 * AvailabilitySlot.
 *
 * @param {string} openingHours - venue's opening_hours ('HH:MM[:SS]')
 * @param {string} closingHours - venue's closing_hours ('HH:MM[:SS]')
 * @param {Array<{ startTime: string, endTime: string }>} bookedRanges -
 *   'HH:MM' bounds already resolved to the requested date/timezone
 * @returns {Array<{ startTime: string, endTime: string, available: boolean }>}
 */
export function buildAvailabilitySlots(
  openingHours,
  closingHours,
  bookedRanges = [],
) {
  const openHour = parseHour(openingHours);
  const closeHour = parseHour(closingHours);
  if (openHour == null || closeHour == null || closeHour <= openHour) {
    return [];
  }

  const slots = [];
  for (let hour = openHour; hour < closeHour; hour += 1) {
    const available = !bookedRanges.some(
      (booked) =>
        parseHour(booked.startTime) < hour + 1 &&
        parseHour(booked.endTime) > hour,
    );
    slots.push({
      startTime: formatHour(hour),
      endTime: formatHour(hour + 1),
      available,
    });
  }
  return slots;
}
