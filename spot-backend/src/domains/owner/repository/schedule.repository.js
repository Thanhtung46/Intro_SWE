/** Field + its status/pricing, scoped to a venue owned by ownerId. */
export async function findFieldForOwnerByFieldId(client, fieldId, ownerId) {
  const { rows } = await client.query(
    `SELECT f.field_id, f.venue_id, f.name, f.sport_type, f.status, f.price_per_hour,
       v.opening_hours, v.closing_hours
     FROM schema_venue.fields f
     INNER JOIN schema_venue.venues v ON v.venue_id = f.venue_id
     WHERE f.field_id = $1 AND v.owner_id = $2`,
    [fieldId, ownerId],
  );
  return rows[0] ?? null;
}

/** Bookings for a set of fields on a given date, incl. guest/manual-booking info. */
export async function listBookingsForFieldsOnDate(client, fieldIds, date) {
  if (!fieldIds.length) return [];
  const { rows } = await client.query(
    `SELECT
       b.booking_id,
       b.field_id,
       b.status,
       b.total_amount,
       lower(b.booking_time_range) AS starts_at,
       upper(b.booking_time_range) AS ends_at,
       b.guest_name,
       b.guest_phone,
       up.full_name AS player_full_name
     FROM schema_booking.bookings b
     LEFT JOIN schema_auth.user_profiles up ON up.user_id = b.player_id
     WHERE b.field_id = ANY($1)
       AND b.booking_date = $2::date
       AND b.status <> 'CANCELLED'
     ORDER BY b.field_id ASC, starts_at ASC`,
    [fieldIds, date],
  );
  return rows;
}

export async function insertManualBooking(
  client,
  { ownerId, fieldId, bookingDate, timeRange, totalAmount, customerName, customerPhone, status },
) {
  const { rows } = await client.query(
    `INSERT INTO schema_booking.bookings (
       player_id, field_id, booking_date, booking_time_range,
       total_amount, deposit_amount, status, guest_name, guest_phone
     )
     VALUES (
       $1, $2, $3::date,
       tstzrange($4::timestamptz, $5::timestamptz, '[)'),
       $6, 0, $7, $8, $9
     )
     RETURNING booking_id, field_id, booking_date::text AS booking_date, status,
       total_amount, deposit_amount, guest_name, guest_phone,
       lower(booking_time_range) AS starts_at,
       upper(booking_time_range) AS ends_at`,
    [
      ownerId,
      fieldId,
      bookingDate,
      timeRange.start,
      timeRange.end,
      totalAmount,
      status,
      customerName,
      customerPhone ?? null,
    ],
  );
  return rows[0];
}

export async function findBookingForOwner(client, bookingId, ownerId) {
  const { rows } = await client.query(
    `SELECT b.booking_id, b.field_id, b.status, b.booking_date::text AS booking_date,
       f.name AS field_name, v.name AS venue_name
     FROM schema_booking.bookings b
     INNER JOIN schema_venue.fields f ON f.field_id = b.field_id
     INNER JOIN schema_venue.venues v ON v.venue_id = f.venue_id
     WHERE b.booking_id = $1 AND v.owner_id = $2`,
    [bookingId, ownerId],
  );
  return rows[0] ?? null;
}

export async function cancelBooking(client, bookingId) {
  const { rows } = await client.query(
    `UPDATE schema_booking.bookings
     SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
     WHERE booking_id = $1
     RETURNING booking_id, field_id, booking_date::text AS booking_date, status,
       total_amount, deposit_amount, guest_name, guest_phone,
       lower(booking_time_range) AS starts_at,
       upper(booking_time_range) AS ends_at`,
    [bookingId],
  );
  return rows[0] ?? null;
}
