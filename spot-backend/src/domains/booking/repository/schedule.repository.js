/**
 * Personal schedule: bookings owned by the player + social matches
 * (host or APPROVED participant), joined with venue/field labels.
 */

const BOOKING_SELECT = `
  SELECT
    'BOOKING'::text AS item_type,
    b.booking_id,
    NULL::int AS match_id,
    lower(b.booking_time_range) AS starts_at,
    upper(b.booking_time_range) AS ends_at,
    b.booking_date::text AS booking_date,
    b.status AS booking_status,
    v.name AS venue_name,
    f.name AS field_name,
    v.address,
    f.sport_type,
    NULL::text AS match_role
  FROM schema_booking.bookings b
  INNER JOIN schema_venue.fields f ON f.field_id = b.field_id
  INNER JOIN schema_venue.venues v ON v.venue_id = f.venue_id
  WHERE b.player_id = $1
    AND b.status <> 'CANCELLED'
    AND b.booking_time_range && tstzrange($2::timestamptz, $3::timestamptz, '[)')
`;

const MATCH_SELECT = `
  SELECT
    'MATCH'::text AS item_type,
    b.booking_id,
    m.match_id,
    lower(b.booking_time_range) AS starts_at,
    upper(b.booking_time_range) AS ends_at,
    b.booking_date::text AS booking_date,
    b.status AS booking_status,
    v.name AS venue_name,
    f.name AS field_name,
    v.address,
    COALESCE(m.sport_type, f.sport_type) AS sport_type,
    CASE
      WHEN m.host_id = $1 THEN 'HOST'
      ELSE 'PARTICIPANT'
    END AS match_role
  FROM schema_social.matches m
  INNER JOIN schema_booking.bookings b ON b.booking_id = m.booking_id
  INNER JOIN schema_venue.fields f ON f.field_id = b.field_id
  INNER JOIN schema_venue.venues v ON v.venue_id = f.venue_id
  WHERE b.status <> 'CANCELLED'
    AND b.booking_time_range && tstzrange($2::timestamptz, $3::timestamptz, '[)')
    AND (
      m.host_id = $1
      OR EXISTS (
        SELECT 1
        FROM schema_social.match_participants mp
        WHERE mp.match_id = m.match_id
          AND mp.player_id = $1
          AND mp.join_status = 'APPROVED'
      )
    )
`;

export async function listScheduleForUser(
  client,
  userId,
  { type = 'all', rangeStart, rangeEnd, limit = 50 },
) {
  const values = [userId, rangeStart, rangeEnd, limit];
  let sql;

  if (type === 'booking') {
    sql = `
      ${BOOKING_SELECT}
      ORDER BY starts_at ASC
      LIMIT $4
    `;
  } else if (type === 'match') {
    sql = `
      ${MATCH_SELECT}
      ORDER BY starts_at ASC
      LIMIT $4
    `;
  } else {
    sql = `
      (
        ${BOOKING_SELECT}
      )
      UNION ALL
      (
        ${MATCH_SELECT}
      )
      ORDER BY starts_at ASC
      LIMIT $4
    `;
  }

  const { rows } = await client.query(sql, values);
  return rows;
}

/**
 * Main Profile stats: booking-linked social matches + pickup kèo.
 * reviewsCount / avgRating stay stubbed until host-review model exists.
 */
export async function getProfileStatsForUser(client, userId) {
  const { rows } = await client.query(
    `SELECT
       (SELECT COUNT(*)::int
          FROM schema_social.matches m
         WHERE m.host_id = $1)
       + (SELECT COUNT(*)::int
          FROM schema_matchmaking.matches m
         WHERE m.host_user_id = $1
           AND m.status <> 'CANCELLED') AS hosted_matches,
       (SELECT COUNT(*)::int
          FROM schema_social.match_participants mp
         WHERE mp.player_id = $1
           AND mp.join_status = 'APPROVED')
       +        (SELECT COUNT(*)::int
          FROM schema_matchmaking.match_join_requests r
         WHERE r.user_id = $1
           AND r.status = 'ACCEPTED') AS joined_matches,
       (SELECT COUNT(*)::int
          FROM schema_review.match_host_reviews hr
         WHERE hr.host_user_id = $1) AS host_reviews_count,
       (SELECT ROUND(AVG(hr.rating)::numeric, 1)
          FROM schema_review.match_host_reviews hr
         WHERE hr.host_user_id = $1) AS host_avg_rating,
       (SELECT COUNT(*)::int
          FROM schema_booking.bookings b
         WHERE b.player_id = $1
           AND b.status = 'COMPLETED') AS completed_bookings`,
    [userId],
  );
  const row = rows[0] || {};
  const reviewsCount = Number(row.host_reviews_count ?? 0);
  return {
    hostedMatches: row.hosted_matches ?? 0,
    joinedMatches: row.joined_matches ?? 0,
    completedBookings: row.completed_bookings ?? 0,
    reviewsCount,
    avgRating:
      reviewsCount > 0 && row.host_avg_rating != null
        ? Number(row.host_avg_rating)
        : null,
  };
}

export async function insertVenue(
  client,
  { ownerId, name, address, openingHours = null, closingHours = null },
) {
  const { rows } = await client.query(
    `INSERT INTO schema_venue.venues (owner_id, name, address, opening_hours, closing_hours)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING venue_id, name, address, opening_hours, closing_hours`,
    [ownerId, name, address, openingHours, closingHours],
  );
  return rows[0];
}

export async function insertField(
  client,
  { venueId, name, sportType, pricePerHour },
) {
  const { rows } = await client.query(
    `INSERT INTO schema_venue.fields (venue_id, name, sport_type, price_per_hour)
     VALUES ($1, $2, $3, $4)
     RETURNING field_id, name, sport_type`,
    [venueId, name, sportType, pricePerHour],
  );
  return rows[0];
}

export async function insertVenueImage(
  client,
  { venueId, imageUrl, displayOrder = 0 },
) {
  const { rows } = await client.query(
    `INSERT INTO schema_venue.venue_images (venue_id, image_url, display_order)
     VALUES ($1, $2, $3)
     RETURNING image_id, venue_id, image_url, display_order`,
    [venueId, imageUrl, displayOrder],
  );
  return rows[0];
}

export async function insertBooking(
  client,
  {
    playerId,
    fieldId,
    bookingDate,
    rangeStart,
    rangeEnd,
    totalAmount,
    depositAmount,
    status = 'PAID',
  },
) {
  const { rows } = await client.query(
    `INSERT INTO schema_booking.bookings (
       player_id, field_id, booking_date, booking_time_range,
       total_amount, deposit_amount, status
     )
     VALUES (
       $1, $2, $3::date,
       tstzrange($4::timestamptz, $5::timestamptz, '[)'),
       $6, $7, $8
     )
     RETURNING booking_id, booking_date::text AS booking_date, status,
       lower(booking_time_range) AS starts_at,
       upper(booking_time_range) AS ends_at`,
    [
      playerId,
      fieldId,
      bookingDate,
      rangeStart,
      rangeEnd,
      totalAmount,
      depositAmount,
      status,
    ],
  );
  return rows[0];
}

export async function insertMatch(
  client,
  {
    hostId,
    bookingId,
    sportType,
    maxPlayers = 10,
    pricePerPlayer = 0,
    requiredSkill = 'BEGINNER',
  },
) {
  const { rows } = await client.query(
    `INSERT INTO schema_social.matches (
       host_id, booking_id, sport_type, max_players, price_per_player, required_skill
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING match_id, host_id, booking_id, sport_type`,
    [hostId, bookingId, sportType, maxPlayers, pricePerPlayer, requiredSkill],
  );
  return rows[0];
}
