import { SCHEDULE_DISPLAY_STATUSES } from '../../../shared/constants/schedule.js';

/**
 * Time-based bucket for a schedule item — see SCHEDULE_DISPLAY_STATUSES.
 * CANCELLED bookings/matches never reach here (excluded by the repository
 * query); NO_SHOW is the only real-world case that lands in the CANCELLED
 * display bucket instead of the UPCOMING/IN_PROGRESS/COMPLETED flow.
 */
export function computeDisplayStatus(row, now) {
  if (row.booking_status === 'NO_SHOW') {
    return SCHEDULE_DISPLAY_STATUSES.CANCELLED;
  }
  if (row.booking_status === 'COMPLETED') {
    return SCHEDULE_DISPLAY_STATUSES.COMPLETED;
  }
  const startsAt = new Date(row.starts_at).getTime();
  const endsAt = new Date(row.ends_at).getTime();
  if (now < startsAt) {
    return SCHEDULE_DISPLAY_STATUSES.UPCOMING;
  }
  if (now < endsAt) {
    return SCHEDULE_DISPLAY_STATUSES.IN_PROGRESS;
  }
  // Past end time but the completion worker hasn't ticked yet (bookings) or
  // the match lifecycle worker hasn't ticked yet (matches) — still surface
  // as completed rather than stuck "in progress" for a stale row.
  return SCHEDULE_DISPLAY_STATUSES.COMPLETED;
}

export function toPublicScheduleItem(row, now = Date.now()) {
  if (!row) return null;

  const item = {
    type: row.item_type,
    bookingId: row.booking_id,
    matchId: row.match_id ?? null,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    bookingDate:
      typeof row.booking_date === 'string'
        ? row.booking_date.slice(0, 10)
        : row.booking_date,
    status: row.booking_status,
    displayStatus: computeDisplayStatus(row, now),
    venueName: row.venue_name,
    fieldName: row.field_name,
    address: row.address,
    sportType: row.sport_type,
    hostName: row.item_type === 'MATCH' ? (row.host_name ?? null) : null,
  };

  item.totalAmountVnd =
    row.item_type === 'BOOKING' && row.total_amount != null
      ? Number(row.total_amount)
      : null;

  if (row.item_type === 'MATCH') {
    item.role = row.match_role ?? null;
  }

  return item;
}
