export function toPublicReview(row, reply = null) {
  if (!row) return null;
  return {
    reviewId: row.review_id,
    bookingId: row.booking_id,
    venueId: row.venue_id,
    playerId: row.player_id,
    rating: row.rating,
    reviewText: row.review_text ?? null,
    createdAt: row.created_at,
    reply: reply ? toPublicReply(reply) : null,
  };
}

export function toPublicReply(row) {
  if (!row) return null;
  return {
    replyId: row.reply_id,
    reviewId: row.review_id,
    ownerId: row.owner_id,
    replyText: row.reply_text,
    createdAt: row.created_at,
  };
}

export function toPublicReviewListItem(row) {
  if (!row) return null;
  return {
    reviewId: row.review_id,
    bookingId: row.booking_id,
    venueId: row.venue_id,
    playerId: row.player_id,
    playerName: row.player_name ?? null,
    playerAvatarUrl: row.player_avatar_url ?? null,
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

export function toPublicVenueRating(row) {
  if (!row) return null;
  return {
    venueId: row.venue_id,
    avgRating: Number(row.avg_rating),
    ratingCount: Number(row.rating_count),
  };
}

export function toPublicRefereeReview(row) {
  if (!row) return null;
  return {
    reviewId: row.review_id,
    assignmentId: row.assignment_id,
    bookingId: row.booking_id,
    refereeId: row.referee_id,
    playerId: row.player_id,
    rating: Number(row.rating),
    createdAt: row.created_at,
  };
}

export function toPublicRefereeRating(row) {
  if (!row) return null;
  return {
    refereeId: row.user_id,
    avgRating: Number(row.avg_rating),
    ratingCount: Number(row.rating_count),
    totalMatchesOfficiated: row.total_matches_officiated,
  };
}
