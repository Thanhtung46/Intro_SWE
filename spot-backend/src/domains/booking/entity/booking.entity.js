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
    hireReferee: Boolean(row.hire_referee),
    refereeFeeVnd: row.referee_fee_vnd != null ? Number(row.referee_fee_vnd) : null,
    bookingCode: row.booking_code ?? null,
    status: row.status,
  };
}

const SLOT_DURATION_MINUTES = 30;

/** 'HH:MM' or 'HH:MM:SS' -> minutes since midnight, or null if unparseable. */
function parseMinutes(value) {
  if (!value) return null;
  const [h, m] = value.split(':');
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

/**
 * Walks from openingHours to closingHours in 30-minute steps, marking a
 * slot unavailable when it overlaps any booked range — per data-model.md
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
  const openMinutes = parseMinutes(openingHours);
  const closeMinutes = parseMinutes(closingHours);
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
    const available = !bookedRanges.some(
      (booked) =>
        parseMinutes(booked.startTime) < end &&
        parseMinutes(booked.endTime) > start,
    );
    slots.push({
      startTime: formatMinutes(start),
      endTime: formatMinutes(end),
      available,
    });
  }
  return slots;
}
