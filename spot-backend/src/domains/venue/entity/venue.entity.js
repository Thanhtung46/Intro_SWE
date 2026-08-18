/** pg TIME column comes back as 'HH:MM:SS' — trim to 'HH:MM'. */
function formatTime(value) {
  if (!value) return null;
  return typeof value === 'string' ? value.slice(0, 5) : value;
}

export function toPublicVenue(row) {
  if (!row) return null;

  const venue = {
    venueId: row.venue_id,
    name: row.name,
    address: row.address,
    amenities: row.amenities ?? null,
    openingHours: formatTime(row.opening_hours),
    closingHours: formatTime(row.closing_hours),
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    avgRating: Number(row.avg_rating),
    ratingCount: Number(row.rating_count),
  };

  // Only present when the repository computed a distance (lat/long query) —
  // see data-model.md PublicVenue.
  if (row.distance_km != null) {
    venue.distanceKm = Number(row.distance_km);
  }

  return venue;
}

export function toPublicVenueImage(row) {
  if (!row) return null;

  return {
    imageId: row.image_id,
    venueId: row.venue_id,
    imageUrl: row.image_url,
    displayOrder: row.display_order,
  };
}

export function toPublicField(row) {
  if (!row) return null;

  return {
    fieldId: row.field_id,
    venueId: row.venue_id,
    name: row.name,
    sportType: row.sport_type,
    pricePerHour: Number(row.price_per_hour),
    capacity: row.capacity,
    status: row.status,
  };
}
