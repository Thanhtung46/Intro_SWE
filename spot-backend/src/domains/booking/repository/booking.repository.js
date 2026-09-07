export async function listBookedRangesForFieldOnDate(client, fieldId, date) {
  const { rows } = await client.query(
    `SELECT
       lower(booking_time_range) AS starts_at,
       upper(booking_time_range) AS ends_at
     FROM schema_booking.bookings
     WHERE field_id = $1
       AND booking_date = $2::date
       AND status <> 'CANCELLED'`,
    [fieldId, date],
  );
  return rows;
}

/** Field + its venue's opening/closing hours, for booking-creation validation. */
export async function findFieldWithVenueForBooking(client, fieldId) {
  const { rows } = await client.query(
    `SELECT
       f.field_id, f.venue_id, f.name AS field_name, f.sport_type,
       f.price_per_hour, f.status AS field_status,
       v.opening_hours, v.closing_hours, v.name AS venue_name, v.owner_id
     FROM schema_venue.fields f
     INNER JOIN schema_venue.venues v ON v.venue_id = f.venue_id
     WHERE f.field_id = $1`,
    [fieldId],
  );
  return rows[0] ?? null;
}

/** Plain insert — conflict detection is left to the EXCLUDE USING gist constraint. */
export async function insertBooking(
  client,
  {
    playerId,
    fieldId,
    bookingDate,
    timeRange,
    totalAmount,
    depositAmount,
    hireReferee = false,
    refereeFeeVnd = null,
  },
) {
  const { rows } = await client.query(
    `INSERT INTO schema_booking.bookings (
       player_id, field_id, booking_date, booking_time_range,
       total_amount, deposit_amount, status,
       hire_referee, referee_fee_vnd
     )
     VALUES (
       $1, $2, $3::date,
       tstzrange($4::timestamptz, $5::timestamptz, '[)'),
       $6, $7, 'PENDING_PAYMENT',
       $8, $9
     )
     RETURNING booking_id, field_id, booking_date::text AS booking_date, status,
       total_amount, deposit_amount, hire_referee, referee_fee_vnd,
       lower(booking_time_range) AS starts_at,
       upper(booking_time_range) AS ends_at`,
    [
      playerId,
      fieldId,
      bookingDate,
      timeRange.start,
      timeRange.end,
      totalAmount,
      depositAmount,
      hireReferee,
      hireReferee ? refereeFeeVnd : null,
    ],
  );
  return rows[0];
}

export async function findBookingById(client, bookingId) {
  const { rows } = await client.query(
    `SELECT booking_id, player_id, field_id, booking_date::text AS booking_date,
            status, total_amount, deposit_amount, hire_referee, referee_fee_vnd,
            lower(booking_time_range) AS starts_at,
            upper(booking_time_range) AS ends_at
     FROM schema_booking.bookings
     WHERE booking_id = $1`,
    [bookingId],
  );
  return rows[0] ?? null;
}

/**
 * Auto-complete bookings whose scheduled end time has passed — mirrors
 * match-expiry-worker.js's role for pickup kèo. Without this, a booking's
 * `status` never leaves PAID/CHECKED_IN on its own, which silently blocks
 * the review flow (review.service.js gates on status === 'COMPLETED').
 */
export async function completeExpiredBookings(client, { limit = 50 } = {}) {
  const { rows } = await client.query(
    `UPDATE schema_booking.bookings
     SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP
     WHERE booking_id IN (
       SELECT booking_id
       FROM schema_booking.bookings
       WHERE status IN ('PAID', 'CHECKED_IN')
         AND upper(booking_time_range) <= CURRENT_TIMESTAMP
       LIMIT $1
     )
     RETURNING booking_id`,
    [limit],
  );
  return rows.map((row) => row.booking_id);
}

export async function markBookingPaid(client, bookingId, playerId) {
  const { rows } = await client.query(
    `UPDATE schema_booking.bookings
     SET status = 'PAID', updated_at = CURRENT_TIMESTAMP
     WHERE booking_id = $1 AND player_id = $2 AND status = 'PENDING_PAYMENT'
     RETURNING booking_id, field_id, booking_date::text AS booking_date, status,
       total_amount, deposit_amount, hire_referee, referee_fee_vnd, booking_code,
       lower(booking_time_range) AS starts_at,
       upper(booking_time_range) AS ends_at`,
    [bookingId, playerId],
  );
  return rows[0] ?? null;
}

export async function markBookingPaidWithCode(client, bookingId, playerId, bookingCode) {
  const { rows } = await client.query(
    `UPDATE schema_booking.bookings
     SET status = 'PAID',
         booking_code = $3,
         payment_expires_at = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE booking_id = $1 AND player_id = $2 AND status = 'PENDING_PAYMENT'
     RETURNING booking_id, field_id, booking_date::text AS booking_date, status,
       total_amount, deposit_amount, hire_referee, referee_fee_vnd, booking_code,
       lower(booking_time_range) AS starts_at,
       upper(booking_time_range) AS ends_at`,
    [bookingId, playerId, bookingCode],
  );
  return rows[0] ?? null;
}
