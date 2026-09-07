export const SCHEDULE_TIMEZONE = 'Asia/Bangkok';

export const SCHEDULE_ITEM_TYPES = Object.freeze({
  ALL: 'all',
  BOOKING: 'booking',
  MATCH: 'match',
});

export const SCHEDULE_DEFAULT_DAYS = 30;
export const SCHEDULE_DEFAULT_LIMIT = 50;
export const SCHEDULE_MAX_LIMIT = 100;

/**
 * Time-based display bucket for a schedule item — computed server-side
 * (schedule.entity.js) so the mobile app is a pure renderer, not a second
 * place that re-derives the same logic. NO_SHOW bookings map to CANCELLED;
 * CANCELLED rows never reach here (excluded at the repository query level).
 */
export const SCHEDULE_DISPLAY_STATUSES = Object.freeze({
  UPCOMING: 'UPCOMING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
});
