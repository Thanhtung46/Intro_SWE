/**
 * Active venues with at least one ACTIVE field of the given sport.
 * When lat/long are given: filters to ST_DWithin(radiusKm), excludes venues
 * with no stored location, and returns distance_km for ORDER BY nearest-first.
 * Otherwise: no distance filtering, ordered by avg_rating desc.
 */
export async function listActiveVenuesBySport(
  client,
  sportType,
  { lat, long, radiusKm } = {},
) {
  const hasDistance = lat != null && long != null;
  const values = [sportType];
  let distanceSelect = '';
  let distanceFilter = '';
  let orderClause = 'ORDER BY v.avg_rating DESC';

  if (hasDistance) {
    values.push(long, lat, radiusKm ?? 20);
    // $2 = long, $3 = lat, $4 = radiusKm
    distanceSelect = `,
       ST_Distance(v.location, ST_MakePoint($2, $3)::geography) / 1000 AS distance_km`;
    distanceFilter = `
       AND v.location IS NOT NULL
       AND ST_DWithin(v.location, ST_MakePoint($2, $3)::geography, $4 * 1000)`;
    orderClause = 'ORDER BY distance_km ASC';
  }

  const { rows } = await client.query(
    `SELECT
       v.venue_id, v.name, v.address, v.amenities,
       v.opening_hours, v.closing_hours,
       ST_Y(v.location::geometry) AS latitude,
       ST_X(v.location::geometry) AS longitude,
       v.avg_rating, v.rating_count
       ${distanceSelect}
     FROM schema_venue.venues v
     WHERE EXISTS (
       SELECT 1 FROM schema_venue.fields f
       WHERE f.venue_id = v.venue_id
         AND f.sport_type = $1
         AND f.status = 'ACTIVE'
     )
     ${distanceFilter}
     ${orderClause}`,
    values,
  );
  return rows;
}

export async function findVenueById(client, venueId) {
  const { rows } = await client.query(
    `SELECT
       v.venue_id, v.name, v.address, v.amenities,
       v.opening_hours, v.closing_hours,
       ST_Y(v.location::geometry) AS latitude,
       ST_X(v.location::geometry) AS longitude,
       v.avg_rating, v.rating_count
     FROM schema_venue.venues v
     WHERE v.venue_id = $1`,
    [venueId],
  );
  return rows[0] ?? null;
}

export async function listFieldsByVenueId(client, venueId) {
  const { rows } = await client.query(
    `SELECT field_id, venue_id, name, sport_type, price_per_hour, capacity, status
     FROM schema_venue.fields
     WHERE venue_id = $1
     ORDER BY field_id ASC`,
    [venueId],
  );
  return rows;
}

export async function listImagesByVenueId(client, venueId) {
  const { rows } = await client.query(
    `SELECT image_id, venue_id, image_url, display_order
     FROM schema_venue.venue_images
     WHERE venue_id = $1
     ORDER BY display_order ASC, image_id ASC`,
    [venueId],
  );
  return rows;
}
