export const BOOKING_DEPOSIT_PERCENTAGE = 0.3;

/** Postgres exclusion-constraint-violation code — see bookings' EXCLUDE USING gist. */
export const EXCLUSION_VIOLATION_CODE = '23P01';

/** Max items in one POST /bookings/bulk request (single player, single confirm action). */
export const BOOKING_BULK_MAX = 20;
