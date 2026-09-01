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

export async function markBookingPaid(client, bookingId, playerId) {
  const { rows } = await client.query(
    `UPDATE schema_booking.bookings
     SET status = 'PAID', updated_at = CURRENT_TIMESTAMP
     WHERE booking_id = $1 AND player_id = $2 AND status = 'PENDING_PAYMENT'
     RETURNING booking_id, field_id, booking_date::text AS booking_date, status,
       total_amount, deposit_amount, hire_referee, referee_fee_vnd,
       lower(booking_time_range) AS starts_at,
       upper(booking_time_range) AS ends_at`,
    [bookingId, playerId],
  );
  return rows[0] ?? null;
}
