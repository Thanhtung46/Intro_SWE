export const FIELD_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  MAINTENANCE: 'MAINTENANCE',
  INACTIVE: 'INACTIVE',
});

export const REVENUE_BOOKING_STATUSES = Object.freeze([
  'PAID',
  'CHECKED_IN',
  'COMPLETED',
]);

export const REVENUE_CURRENCY = 'VND';

export const REVENUE_GRANULARITIES = Object.freeze({
  WEEK: 'week',
  MONTH: 'month',
});

export const OWNER_REVENUE_CACHE_PREFIX = 'owner:revenue:';
export const OWNER_REVENUE_CACHE_TTL_SECONDS = 300;

export const OWNER_REVENUE_EXPORT_MAX_ROWS = 10_000;
