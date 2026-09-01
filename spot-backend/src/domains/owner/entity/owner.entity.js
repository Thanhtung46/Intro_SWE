function formatTime(value) {
  if (!value) return null;
  return typeof value === 'string' ? value.slice(0, 5) : value;
}

export function toOwnerVenueSummary(row) {
  if (!row) return null;
  return {
    venueId: row.venue_id,
    name: row.name,
    address: row.address,
    fieldCount: Number(row.field_count ?? 0),
    activeFieldCount: Number(row.active_field_count ?? 0),
    maintenanceFieldCount: Number(row.maintenance_field_count ?? 0),
    avgRating: Number(row.avg_rating),
    ratingCount: Number(row.rating_count),
  };
}

export function toOwnerVenueDetail(row) {
  if (!row) return null;
  return {
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toOwnerField(row) {
  if (!row) return null;
  return {
    fieldId: row.field_id,
    venueId: row.venue_id,
    name: row.name,
    sportType: row.sport_type,
    pricePerHour: Number(row.price_per_hour),
    peakPricePerHour:
      row.peak_price_per_hour != null
        ? Number(row.peak_price_per_hour)
        : Number(row.price_per_hour),
    offPeakPricePerHour:
      row.off_peak_price_per_hour != null
        ? Number(row.off_peak_price_per_hour)
        : Number(row.price_per_hour),
    capacity: row.capacity,
    status: row.status,
    maintenanceNote: row.maintenance_note ?? null,
    isAvailableNow: Boolean(row.is_available_now),
  };
}

export function toOwnerVenueImage(row) {
  if (!row) return null;
  return {
    imageId: row.image_id,
    venueId: row.venue_id,
    imageUrl: row.image_url,
    displayOrder: row.display_order,
  };
}

export function toOwnerReviewListItem(row) {
  if (!row) return null;
  return {
    reviewId: row.review_id,
    venueId: row.venue_id,
    venueName: row.venue_name,
    bookingId: row.booking_id,
    playerId: row.player_id,
    playerName: row.player_name ?? null,
    rating: row.rating,
    reviewText: row.review_text ?? null,
    createdAt: row.created_at,
    hasReply: Boolean(row.reply_id),
    replyText: row.reply_text ?? null,
    replyCreatedAt: row.reply_created_at ?? null,
  };
}

export function toOwnerReviewDetail(row) {
  if (!row) return null;
  return {
    reviewId: row.review_id,
    venueId: row.venue_id,
    venueName: row.venue_name,
    bookingId: row.booking_id,
    bookingDate: row.booking_date,
    fieldName: row.field_name,
    playerId: row.player_id,
    playerName: row.player_name ?? null,
    rating: row.rating,
    reviewText: row.review_text ?? null,
    createdAt: row.created_at,
    reply: row.reply_id
      ? {
          replyId: row.reply_id,
          replyText: row.reply_text,
          createdAt: row.reply_created_at,
        }
      : null,
  };
}

export function toScheduleBooking(row) {
  if (!row) return null;
  return {
    bookingId: row.booking_id,
    fieldId: row.field_id,
    bookingDate: row.booking_date,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    totalAmount: row.total_amount != null ? Number(row.total_amount) : null,
    customerName: row.guest_name ?? row.player_full_name ?? null,
    customerPhone: row.guest_phone ?? null,
  };
}
