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
       f.field_id, f.venue_id, f.price_per_hour, f.status AS field_status,
       v.opening_hours, v.closing_hours,
       v.owner_id AS venue_owner_id, v.name AS venue_name, f.name AS field_name
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
  { playerId, fieldId, bookingDate, timeRange, totalAmount, depositAmount },
) {
  const { rows } = await client.query(
    `INSERT INTO schema_booking.bookings (
       player_id, field_id, booking_date, booking_time_range,
       total_amount, deposit_amount, status
     )
     VALUES (
       $1, $2, $3::date,
       tstzrange($4::timestamptz, $5::timestamptz, '[)'),
       $6, $7, 'PENDING_PAYMENT'
     )
     RETURNING booking_id, field_id, booking_date::text AS booking_date, status,
       total_amount, deposit_amount,
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
    ],
  );
  return rows[0];
}
