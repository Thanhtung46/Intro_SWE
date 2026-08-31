import { REVENUE_BOOKING_STATUSES } from '../../../shared/constants/owner.js';

function revenueFilters(ownerId, { from, to, sport, venueId }) {
  const params = [ownerId, from, to];
  const clauses = [
    'v.owner_id = $1',
    'b.booking_date >= $2::date',
    'b.booking_date <= $3::date',
  ];
  params.push([...REVENUE_BOOKING_STATUSES]);
  clauses.push(`b.status = ANY($${params.length})`);

  if (sport) {
    params.push(sport);
    clauses.push(`f.sport_type = $${params.length}`);
  }
  if (venueId) {
    params.push(venueId);
    clauses.push(`v.venue_id = $${params.length}`);
  }

  return { params, where: clauses.join(' AND ') };
}

export async function sumRevenueBySport(client, ownerId, filters) {
  const { params, where } = revenueFilters(ownerId, filters);
  const { rows } = await client.query(
    `SELECT
       f.sport_type,
       COALESCE(SUM(b.total_amount), 0)::numeric AS revenue,
       COUNT(*)::int AS booking_count
     FROM schema_booking.bookings b
     INNER JOIN schema_venue.fields f ON f.field_id = b.field_id
     INNER JOIN schema_venue.venues v ON v.venue_id = f.venue_id
     WHERE ${where}
     GROUP BY f.sport_type
     ORDER BY revenue DESC`,
    params,
  );
  return rows;
}

export async function sumTotalRevenue(client, ownerId, filters) {
  const { params, where } = revenueFilters(ownerId, filters);
  const { rows } = await client.query(
    `SELECT COALESCE(SUM(b.total_amount), 0)::numeric AS total
     FROM schema_booking.bookings b
     INNER JOIN schema_venue.fields f ON f.field_id = b.field_id
     INNER JOIN schema_venue.venues v ON v.venue_id = f.venue_id
     WHERE ${where}`,
    params,
  );
  return Number(rows[0]?.total ?? 0);
}

export async function revenueTimeseries(client, ownerId, filters, granularity) {
  const { params, where } = revenueFilters(ownerId, filters);
  const trunc =
    granularity === 'week'
      ? `date_trunc('week', b.booking_date::timestamp)`
      : `date_trunc('month', b.booking_date::timestamp)`;

  const { rows } = await client.query(
    `SELECT
       ${trunc} AS period_start,
       COALESCE(SUM(b.total_amount), 0)::numeric AS revenue,
       COUNT(*)::int AS booking_count
     FROM schema_booking.bookings b
     INNER JOIN schema_venue.fields f ON f.field_id = b.field_id
     INNER JOIN schema_venue.venues v ON v.venue_id = f.venue_id
     WHERE ${where}
     GROUP BY 1
     ORDER BY 1 ASC`,
    params,
  );
  return rows;
}

export async function revenueExportRows(client, ownerId, filters, limit) {
  const { params, where } = revenueFilters(ownerId, filters);
  params.push(limit);
  const { rows } = await client.query(
    `SELECT
       b.booking_id,
       b.booking_date,
       v.name AS venue_name,
       f.name AS field_name,
       f.sport_type,
       b.status,
       b.total_amount
     FROM schema_booking.bookings b
     INNER JOIN schema_venue.fields f ON f.field_id = b.field_id
     INNER JOIN schema_venue.venues v ON v.venue_id = f.venue_id
     WHERE ${where}
     ORDER BY b.booking_date DESC, b.booking_id DESC
     LIMIT $${params.length}`,
    params,
  );
  return rows;
}

export async function ownerOwnsVenue(client, ownerId, venueId) {
  const { rows } = await client.query(
    `SELECT 1 FROM schema_venue.venues WHERE venue_id = $1 AND owner_id = $2`,
    [venueId, ownerId],
  );
  return rows.length > 0;
}
