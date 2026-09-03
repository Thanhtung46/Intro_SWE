/**
 * Active venues with at least one ACTIVE field of the given sport.
 * When lat/long are given: filters to ST_DWithin(radiusKm), excludes venues
 * with no stored location, and returns distance_km for ORDER BY nearest-first.
 * Otherwise: no distance filtering, ordered by avg_rating desc.
 */
const FOLD = 'schema_matchmaking.fold_search_text';
const FUZZY_MIN_CHARS = 3;
const LIST_SIMILARITY = 0.28;

function venueSearchPredicate(qSlot) {
  const q = `${FOLD}(${qSlot})`;
  const name = `${FOLD}(v.name)`;
  const address = `${FOLD}(v.address)`;
  return `(
    ${q} <> ''
    AND (
      position(${q} in ${name}) > 0
      OR position(${q} in ${address}) > 0
      OR (
        length(${q}) >= ${FUZZY_MIN_CHARS}
        AND GREATEST(
          similarity(${name}, ${q}),
          similarity(${address}, ${q})
        ) >= ${LIST_SIMILARITY}
      )
    )
  )`;
}

export async function listActiveVenuesBySport(
  client,
  sportType,
  { lat, long, radiusKm, province, city, priceMin, priceMax, date, timeFrom, timeTo } = {},
) {
  const hasDistance = lat != null && long != null;
  const hasAvailability = date != null && timeFrom != null && timeTo != null;
  const values = [sportType];
  let paramIdx = 2;
  const add = (value) => {
    values.push(value);
    const slot = `$${paramIdx}`;
    paramIdx += 1;
    return slot;
  };

  let distanceSelect = '';
  const where = [];
  let orderClause = 'ORDER BY v.avg_rating DESC';

  if (hasDistance) {
    const longSlot = add(long);
    const latSlot = add(lat);
    const radiusSlot = add(radiusKm ?? 20);
    distanceSelect = `,
       ST_Distance(v.location, ST_MakePoint(${longSlot}, ${latSlot})::geography) / 1000 AS distance_km`;
    where.push(
      `v.location IS NOT NULL
       AND ST_DWithin(v.location, ST_MakePoint(${longSlot}, ${latSlot})::geography, ${radiusSlot} * 1000)`,
    );
    orderClause = 'ORDER BY distance_km ASC';
  }

  if (province) {
    where.push(`v.province = ${add(province)}`);
  }
  if (city) {
    where.push(`v.city = ${add(city)}`);
  }

  let priceFilter = '';
  if (priceMin != null) {
    priceFilter += `\n         AND f.price_per_hour >= ${add(priceMin)}`;
  }
  if (priceMax != null) {
    priceFilter += `\n         AND f.price_per_hour <= ${add(priceMax)}`;
  }

  let availabilityFilter = '';
  if (hasAvailability) {
    const startSlot = add(new Date(`${date}T${timeFrom}:00+07:00`));
    const endSlot = add(new Date(`${date}T${timeTo}:00+07:00`));
    const dateSlot = add(date);
    availabilityFilter = `
         AND NOT EXISTS (
           SELECT 1 FROM schema_booking.bookings b
           WHERE b.field_id = f.field_id
             AND b.booking_date = ${dateSlot}::date
             AND b.status <> 'CANCELLED'
             AND b.booking_time_range && tstzrange(${startSlot}::timestamptz, ${endSlot}::timestamptz, '[)')
         )`;
  }

  where.push(`EXISTS (
       SELECT 1 FROM schema_venue.fields f
       WHERE f.venue_id = v.venue_id
         AND f.sport_type = $1
         AND f.status = 'ACTIVE'${priceFilter}${availabilityFilter}
     )`);

  const { rows } = await client.query(
    `SELECT
       v.venue_id, v.name, v.address, v.amenities,
       v.opening_hours, v.closing_hours,
       ST_Y(v.location::geometry) AS latitude,
       ST_X(v.location::geometry) AS longitude,
       v.avg_rating, v.rating_count
       ${distanceSelect}
     FROM schema_venue.venues v
     WHERE ${where.join('\n       AND ')}
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
       v.avg_rating, v.rating_count,
       u.user_id AS owner_id, p.full_name AS owner_name,
       p.avatar_url AS owner_avatar_url, u.phone_number AS owner_phone
     FROM schema_venue.venues v
     JOIN schema_auth.users u ON u.user_id = v.owner_id
     LEFT JOIN schema_auth.user_profiles p ON p.user_id = u.user_id
     WHERE v.venue_id = $1`,
    [venueId],
  );
  return rows[0] ?? null;
}

export async function listFieldsByVenueId(client, venueId) {
  const { rows } = await client.query(
    `SELECT field_id, venue_id, name, sport_type, football_variant, price_per_hour, capacity, status
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

/** Job Board: venues with sport + filters, excluding referee active registrations. */
export async function listBoardVenuesForReferee(
  client,
  sportType,
  {
    lat,
    long,
    radiusKm,
    province,
    city,
    q,
    favorited,
    refereeId,
    excludeVenueIds = [],
    limit,
    offset,
  } = {},
) {
  const values = [sportType];
  let paramIdx = 2;
  const add = (value) => {
    values.push(value);
    const slot = `$${paramIdx}`;
    paramIdx += 1;
    return slot;
  };

  const where = [
    `EXISTS (
       SELECT 1 FROM schema_venue.fields f
       WHERE f.venue_id = v.venue_id
         AND f.sport_type = $1
         AND f.status = 'ACTIVE'
     )`,
  ];

  let distanceSelect = '';
  // Tiebreaker: within venues of equal rating (all seed/new venues are 0),
  // surface the most recently added first instead of a non-deterministic order.
  let orderClause = 'ORDER BY v.avg_rating DESC, v.venue_id DESC';

  if (lat != null && long != null) {
    const lngSlot = add(long);
    const latSlot = add(lat);
    const radiusSlot = add(radiusKm ?? 20);
    distanceSelect = `,
       ST_Distance(v.location, ST_MakePoint(${lngSlot}, ${latSlot})::geography) / 1000 AS distance_km`;
    where.push(
      `v.location IS NOT NULL
       AND ST_DWithin(v.location, ST_MakePoint(${lngSlot}, ${latSlot})::geography, ${radiusSlot} * 1000)`,
    );
    orderClause = 'ORDER BY distance_km ASC, v.venue_id DESC';
  }

  if (province) {
    where.push(`v.province = ${add(province)}`);
  }
  if (city) {
    where.push(`v.city = ${add(city)}`);
  }

  if (q) {
    const qSlot = add(q);
    where.push(venueSearchPredicate(qSlot));
  }

  if (favorited && refereeId != null) {
    const refSlot = add(refereeId);
    where.push(
      `EXISTS (
         SELECT 1
         FROM schema_referee.referee_venue_favorites fv
         WHERE fv.venue_id = v.venue_id
           AND fv.referee_id = ${refSlot}
       )`,
    );
  }

  if (excludeVenueIds.length > 0) {
    where.push(`v.venue_id <> ALL(${add(excludeVenueIds)}::int[])`);
  }

  let isFavoritedSelect = ', FALSE AS is_favorited';
  if (refereeId != null) {
    const favRefSlot = add(refereeId);
    isFavoritedSelect = `,
       EXISTS (
         SELECT 1
         FROM schema_referee.referee_venue_favorites fv
         WHERE fv.venue_id = v.venue_id
           AND fv.referee_id = ${favRefSlot}
       ) AS is_favorited`;
  }

  values.push(limit ?? 20, offset ?? 0);
  const limitSlot = `$${paramIdx}`;
  const offsetSlot = `$${paramIdx + 1}`;

  const { rows } = await client.query(
    `SELECT
       v.venue_id, v.name, v.address,
       v.province, v.city,
       ST_Y(v.location::geometry) AS latitude,
       ST_X(v.location::geometry) AS longitude,
       v.avg_rating, v.rating_count,
       $1::varchar AS sport_type,
       p.full_name AS owner_name
       ${distanceSelect}
       ${isFavoritedSelect}
     FROM schema_venue.venues v
     JOIN schema_auth.users u ON u.user_id = v.owner_id
     LEFT JOIN schema_auth.user_profiles p ON p.user_id = u.user_id
     WHERE ${where.join('\n       AND ')}
     ${orderClause}
     LIMIT ${limitSlot} OFFSET ${offsetSlot}`,
    values,
  );
  return rows;
}
