const VENUE_RETURNING = `
  venue_id, owner_id, name, address, amenities,
  opening_hours, closing_hours,
  ST_Y(location::geometry) AS latitude,
  ST_X(location::geometry) AS longitude,
  avg_rating, rating_count, created_at, updated_at
`;

export async function listVenuesByOwner(client, ownerId) {
  const { rows } = await client.query(
    `SELECT
       v.venue_id, v.name, v.address, v.avg_rating, v.rating_count,
       COUNT(f.field_id)::int AS field_count,
       COUNT(f.field_id) FILTER (WHERE f.status = 'ACTIVE')::int AS active_field_count,
       COUNT(f.field_id) FILTER (WHERE f.status = 'MAINTENANCE')::int AS maintenance_field_count
     FROM schema_venue.venues v
     LEFT JOIN schema_venue.fields f ON f.venue_id = v.venue_id
     WHERE v.owner_id = $1
     GROUP BY v.venue_id
     ORDER BY v.created_at DESC`,
    [ownerId],
  );
  return rows;
}

export async function findVenueForOwner(client, venueId, ownerId) {
  const { rows } = await client.query(
    `SELECT ${VENUE_RETURNING}
     FROM schema_venue.venues
     WHERE venue_id = $1 AND owner_id = $2`,
    [venueId, ownerId],
  );
  return rows[0] ?? null;
}

export async function insertVenue(client, ownerId, dto) {
  const hasLocation = dto.latitude != null && dto.longitude != null;
  const { rows } = await client.query(
    `INSERT INTO schema_venue.venues (
       owner_id, name, address, amenities, opening_hours, closing_hours, location
     )
     VALUES (
       $1, $2, $3, $4, $5::time, $6::time,
       ${hasLocation ? 'ST_SetSRID(ST_MakePoint($7, $8), 4326)::geography' : 'NULL'}
     )
     RETURNING ${VENUE_RETURNING}`,
    hasLocation
      ? [
          ownerId,
          dto.name,
          dto.address,
          dto.amenities ?? null,
          dto.openingHours ?? null,
          dto.closingHours ?? null,
          dto.longitude,
          dto.latitude,
        ]
      : [
          ownerId,
          dto.name,
          dto.address,
          dto.amenities ?? null,
          dto.openingHours ?? null,
          dto.closingHours ?? null,
        ],
  );
  return rows[0];
}

export async function updateVenue(client, venueId, ownerId, dto) {
  const sets = [];
  const params = [venueId, ownerId];

  if (dto.name !== undefined) {
    params.push(dto.name);
    sets.push(`name = $${params.length}`);
  }
  if (dto.address !== undefined) {
    params.push(dto.address);
    sets.push(`address = $${params.length}`);
  }
  if (dto.amenities !== undefined) {
    params.push(dto.amenities);
    sets.push(`amenities = $${params.length}`);
  }
  if (dto.openingHours !== undefined) {
    params.push(dto.openingHours);
    sets.push(`opening_hours = $${params.length}::time`);
  }
  if (dto.closingHours !== undefined) {
    params.push(dto.closingHours);
    sets.push(`closing_hours = $${params.length}::time`);
  }
  if (dto.latitude != null && dto.longitude != null) {
    params.push(dto.longitude, dto.latitude);
    sets.push(
      `location = ST_SetSRID(ST_MakePoint($${params.length - 1}, $${params.length}), 4326)::geography`,
    );
  }

  if (sets.length === 0) return findVenueForOwner(client, venueId, ownerId);

  sets.push('updated_at = CURRENT_TIMESTAMP');

  const { rows } = await client.query(
    `UPDATE schema_venue.venues
     SET ${sets.join(', ')}
     WHERE venue_id = $1 AND owner_id = $2
     RETURNING ${VENUE_RETURNING}`,
    params,
  );
  return rows[0] ?? null;
}

export async function listFieldsForVenue(client, venueId) {
  const { rows } = await client.query(
    `SELECT
       f.field_id, f.venue_id, f.name, f.sport_type, f.price_per_hour,
       f.peak_price_per_hour, f.off_peak_price_per_hour, f.capacity, f.status,
       f.maintenance_note,
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
     WHERE f.venue_id = $1
     ORDER BY f.field_id ASC`,
    [venueId],
  );
  return rows;
}

export async function findFieldForOwner(client, fieldId, venueId, ownerId) {
  const { rows } = await client.query(
    `SELECT f.field_id, f.venue_id
     FROM schema_venue.fields f
     INNER JOIN schema_venue.venues v ON v.venue_id = f.venue_id
     WHERE f.field_id = $1 AND f.venue_id = $2 AND v.owner_id = $3`,
    [fieldId, venueId, ownerId],
  );
  return rows[0] ?? null;
}

export async function insertField(client, venueId, dto) {
  const peak = dto.peakPricePerHour ?? dto.pricePerHour;
  const offPeak = dto.offPeakPricePerHour ?? dto.pricePerHour;
  const { rows } = await client.query(
    `INSERT INTO schema_venue.fields (
       venue_id, name, sport_type, price_per_hour,
       peak_price_per_hour, off_peak_price_per_hour,
       capacity, status, maintenance_note
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING field_id, venue_id, name, sport_type, price_per_hour,
       peak_price_per_hour, off_peak_price_per_hour, capacity, status, maintenance_note`,
    [
      venueId,
      dto.name,
      dto.sportType,
      dto.pricePerHour,
      peak,
      offPeak,
      dto.capacity ?? 10,
      dto.status ?? 'ACTIVE',
      dto.maintenanceNote ?? null,
    ],
  );
  return rows[0];
}

export async function updateField(client, fieldId, dto) {
  const sets = [];
  const params = [fieldId];

  const map = {
    name: 'name',
    sportType: 'sport_type',
    pricePerHour: 'price_per_hour',
    peakPricePerHour: 'peak_price_per_hour',
    offPeakPricePerHour: 'off_peak_price_per_hour',
    capacity: 'capacity',
    status: 'status',
    maintenanceNote: 'maintenance_note',
  };

  for (const [key, column] of Object.entries(map)) {
    if (dto[key] !== undefined) {
      params.push(dto[key]);
      sets.push(`${column} = $${params.length}`);
    }
  }

  if (sets.length === 0) return null;

  const { rows } = await client.query(
    `UPDATE schema_venue.fields
     SET ${sets.join(', ')}
     WHERE field_id = $1
     RETURNING field_id, venue_id, name, sport_type, price_per_hour,
       peak_price_per_hour, off_peak_price_per_hour, capacity, status, maintenance_note`,
    params,
  );
  return rows[0] ?? null;
}

export async function softDeleteField(client, fieldId) {
  const { rows } = await client.query(
    `UPDATE schema_venue.fields
     SET status = 'INACTIVE'
     WHERE field_id = $1
     RETURNING field_id`,
    [fieldId],
  );
  return rows[0] ?? null;
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

export async function replaceVenueImages(client, venueId, images) {
  await client.query(
    `DELETE FROM schema_venue.venue_images WHERE venue_id = $1`,
    [venueId],
  );
  if (!images.length) return [];

  const values = [];
  const placeholders = images.map((img, idx) => {
    const base = idx * 3;
    values.push(venueId, img.imageUrl, img.displayOrder ?? idx);
    return `($${base + 1}, $${base + 2}, $${base + 3})`;
  });

  const { rows } = await client.query(
    `INSERT INTO schema_venue.venue_images (venue_id, image_url, display_order)
     VALUES ${placeholders.join(', ')}
     RETURNING image_id, venue_id, image_url, display_order`,
    values,
  );
  return rows;
}
