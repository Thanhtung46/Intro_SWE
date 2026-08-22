export function toPublicRefereeProfile(row, userRow) {
  if (!row) return null;
  return {
    userId: row.user_id,
    fullName: userRow?.full_name ?? null,
    avatarUrl: userRow?.avatar_url ?? null,
    certifiedSportTypes: row.certified_sport_types ?? [],
    totalMatchesOfficiated: row.total_matches_officiated,
    avgRating: Number(row.avg_rating),
    ratingCount: row.rating_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toPublicVenueRegistration(row) {
  if (!row) return null;
  return {
    registrationId: row.registration_id,
    venueId: row.venue_id,
    venueName: row.venue_name,
    venueAddress: row.venue_address ?? null,
    ownerName: row.owner_name ?? null,
    sportType: row.sport_type,
    status: row.status,
    registeredAt: row.created_at,
  };
}

export function toPublicBoardVenue(row) {
  return {
    venueId: row.venue_id,
    name: row.name,
    address: row.address,
    province: row.province ?? null,
    city: row.city ?? null,
    provinceName: row.province_name ?? null,
    cityName: row.city_name ?? null,
    latitude: row.latitude != null ? Number(row.latitude) : undefined,
    longitude: row.longitude != null ? Number(row.longitude) : undefined,
    ownerName: row.owner_name ?? null,
    sportType: row.sport_type,
    avgRating: Number(row.avg_rating),
    ratingCount: row.rating_count,
    distanceKm: row.distance_km != null ? Number(row.distance_km) : undefined,
    isFavorited: Boolean(row.is_favorited),
  };
}

export function toPublicMatchInvitation(row) {
  return {
    assignmentId: row.assignment_id,
    bookingId: row.booking_id,
    venueId: row.venue_id,
    venueName: row.venue_name,
    playerName: row.player_name ?? null,
    sportType: row.sport_type,
    startsAt: row.starts_at,
    endsAt: row.ends_at ?? null,
    feeVnd: Number(row.fee_vnd),
    status: row.status,
  };
}

export function toPublicAssignmentDetail(row) {
  if (!row) return null;
  return {
    assignmentId: row.assignment_id,
    bookingId: row.booking_id,
    venueId: row.venue_id,
    venueName: row.venue_name,
    venueAddress: row.venue_address ?? null,
    playerName: row.player_name ?? null,
    ownerName: row.owner_name ?? null,
    sportType: row.sport_type,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    feeVnd: Number(row.fee_vnd),
    status: row.status,
    source: row.source,
    acceptedAt: row.accepted_at ?? null,
    completedAt: row.completed_at ?? null,
    declineReason: row.decline_reason ?? null,
    createdAt: row.created_at,
  };
}

export function toPublicScheduleItem(row) {
  return {
    assignmentId: row.assignment_id,
    bookingId: row.booking_id,
    venueId: row.venue_id,
    venueName: row.venue_name,
    sportType: row.sport_type,
    playerName: row.player_name ?? null,
    bookingDate: row.booking_date,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    feeVnd: Number(row.fee_vnd),
    status: row.status,
    isUpcoming: new Date(row.starts_at) > new Date(),
  };
}

export function toPublicEarningsHistoryItem(row, index, offset) {
  return {
    index: offset + index + 1,
    assignmentId: row.assignment_id,
    bookingId: row.booking_id,
    venueName: row.venue_name,
    sportType: row.sport_type,
    playerName: row.player_name ?? null,
    startsAt: row.starts_at,
    feeVnd: Number(row.fee_vnd),
    completedAt: row.completed_at,
  };
}

export function toPublicCertification(row) {
  return {
    verificationReqId: row.verification_req_id,
    documentKind: row.document_kind ?? null,
    documentUrl: row.document_url,
    status: row.status,
    adminNotes: row.admin_notes ?? null,
    reviewedAt: row.reviewed_at ?? null,
    createdAt: row.created_at,
  };
}
