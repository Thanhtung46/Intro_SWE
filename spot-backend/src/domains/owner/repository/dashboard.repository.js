import { REVENUE_BOOKING_STATUSES } from '../../../shared/constants/owner.js';

function ownerVenueClause(ownerId, venueId, paramStart = 1) {
  const params = [ownerId];
  let clause = 'v.owner_id = $1';
  if (venueId) {
    params.push(venueId);
    clause += ` AND v.venue_id = $${paramStart + 1}`;
  }
  return { params, clause };
}

export async function countPendingBookings(client, ownerId, venueId) {
  const { params, clause } = ownerVenueClause(ownerId, venueId);
  const { rows } = await client.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (
         WHERE lower(b.booking_time_range) <= CURRENT_TIMESTAMP + interval '24 hours'
           AND lower(b.booking_time_range) > CURRENT_TIMESTAMP
       )::int AS urgent_count
     FROM schema_booking.bookings b
     INNER JOIN schema_venue.fields f ON f.field_id = b.field_id
     INNER JOIN schema_venue.venues v ON v.venue_id = f.venue_id
     WHERE ${clause}
       AND b.status = 'PENDING_PAYMENT'
       AND upper(b.booking_time_range) > CURRENT_TIMESTAMP`,
    params,
  );
  return {
    count: rows[0]?.total ?? 0,
    urgentCount: rows[0]?.urgent_count ?? 0,
  };
}

export async function countNewReviewsInRange(client, ownerId, { from, to }, venueId) {
  const { params, clause } = ownerVenueClause(ownerId, venueId);
  params.push(from, to);
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM schema_review.reviews r
     INNER JOIN schema_venue.venues v ON v.venue_id = r.venue_id
     WHERE ${clause}
       AND r.created_at >= $${params.length - 1}::date
       AND r.created_at < ($${params.length}::date + interval '1 day')`,
    params,
  );
  return rows[0]?.total ?? 0;
}

export async function bookingTrendsByDayOfWeek(
  client,
  ownerId,
  { from, to },
  venueId,
) {
  const { params, clause } = ownerVenueClause(ownerId, venueId);
  params.push(from, to);
  const { rows } = await client.query(
    `SELECT
       EXTRACT(ISODOW FROM b.booking_date)::int AS day_of_week,
       COUNT(*)::int AS booking_count
     FROM schema_booking.bookings b
     INNER JOIN schema_venue.fields f ON f.field_id = b.field_id
     INNER JOIN schema_venue.venues v ON v.venue_id = f.venue_id
     WHERE ${clause}
       AND b.booking_date >= $${params.length - 1}::date
       AND b.booking_date <= $${params.length}::date
       AND b.status <> 'CANCELLED'
     GROUP BY 1
     ORDER BY 1 ASC`,
    params,
  );
  return rows;
}

export async function occupancyForRange(client, ownerId, { from, to }, venueId) {
  const { params, clause } = ownerVenueClause(ownerId, venueId);
  params.push(from, to, [...REVENUE_BOOKING_STATUSES]);
  const fromIdx = params.length - 2;
  const toIdx = params.length - 1;
  const statusIdx = params.length;

  const { rows } = await client.query(
    `WITH owner_fields AS (
       SELECT
         f.field_id,
         COALESCE(
           EXTRACT(EPOCH FROM (v.closing_hours - v.opening_hours)) / 3600.0,
           12.0
         ) AS hours_per_day
       FROM schema_venue.fields f
       INNER JOIN schema_venue.venues v ON v.venue_id = f.venue_id
       WHERE ${clause}
         AND f.status = 'ACTIVE'
     ),
     day_count AS (
       SELECT GREATEST(($${toIdx}::date - $${fromIdx}::date) + 1, 0)::int AS days
     ),
     capacity AS (
       SELECT
         COALESCE(SUM(of.hours_per_day), 0)
           * (SELECT days FROM day_count) AS available_hours
       FROM owner_fields of
     ),
     booked AS (
       SELECT COALESCE(
         SUM(
           EXTRACT(EPOCH FROM (upper(b.booking_time_range) - lower(b.booking_time_range)))
           / 3600.0
         ),
         0
       )::numeric AS booked_hours
       FROM schema_booking.bookings b
       INNER JOIN schema_venue.fields f ON f.field_id = b.field_id
       INNER JOIN schema_venue.venues v ON v.venue_id = f.venue_id
       WHERE ${clause}
         AND b.booking_date >= $${fromIdx}::date
         AND b.booking_date <= $${toIdx}::date
         AND b.status = ANY($${statusIdx})
     )
     SELECT capacity.available_hours, booked.booked_hours
     FROM capacity, booked`,
    params,
  );

  const availableHours = Number(rows[0]?.available_hours ?? 0);
  const bookedHours = Number(rows[0]?.booked_hours ?? 0);
  const percent =
    availableHours > 0
      ? Math.min(100, Math.round((bookedHours / availableHours) * 1000) / 10)
      : 0;

  return { percent, bookedHours, availableHours };
}

export async function listRecentActivities(client, ownerId, { limit, venueId }) {
  const { params, clause } = ownerVenueClause(ownerId, venueId);

  const { rows } = await client.query(
    `(
       SELECT
         'BOOKING_CREATED' AS activity_type,
         b.created_at AS occurred_at,
         b.booking_id AS reference_id,
         v.name AS venue_name,
         f.name AS field_name,
         b.status AS status,
         NULL::int AS rating
       FROM schema_booking.bookings b
       INNER JOIN schema_venue.fields f ON f.field_id = b.field_id
       INNER JOIN schema_venue.venues v ON v.venue_id = f.venue_id
       WHERE ${clause}
     )
     UNION ALL
     (
       SELECT
         'REVIEW_CREATED' AS activity_type,
         r.created_at AS occurred_at,
         r.review_id AS reference_id,
         v.name AS venue_name,
         NULL AS field_name,
         NULL AS status,
         r.rating
       FROM schema_review.reviews r
       INNER JOIN schema_venue.venues v ON v.venue_id = r.venue_id
       WHERE ${clause}
     )
     ORDER BY occurred_at DESC
     LIMIT $${params.length + 1}`,
    [...params, limit],
  );
  return rows;
}

export async function listFacilityCards(client, ownerId, venueId) {
  const { params, clause } = ownerVenueClause(ownerId, venueId);
  const { rows } = await client.query(
    `SELECT
       f.field_id,
       f.venue_id,
       v.name AS venue_name,
       f.name AS field_name,
       f.sport_type,
       f.status,
       (
         f.status = 'ACTIVE'
         AND NOT EXISTS (
           SELECT 1
           FROM schema_booking.bookings b
           WHERE b.field_id = f.field_id
             AND b.status <> 'CANCELLED'
             AND b.booking_time_range @> CURRENT_TIMESTAMP
         )
       ) AS is_available_now
     FROM schema_venue.fields f
     INNER JOIN schema_venue.venues v ON v.venue_id = f.venue_id
     WHERE ${clause}
     ORDER BY v.name ASC, f.field_id ASC
     LIMIT 20`,
    params,
  );
  return rows;
}
