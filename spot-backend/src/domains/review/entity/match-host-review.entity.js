export function toPublicMatchHostReview(row) {
  if (!row) return null;
  return {
    reviewId: row.review_id,
    matchId: row.match_id,
    reviewerUserId: row.reviewer_user_id,
    hostUserId: row.host_user_id,
    rating: Number(row.rating),
    reviewText: row.review_text ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toPublicMatchHostReviewListItem(row) {
  if (!row) return null;
  return {
    reviewId: row.review_id,
    rating: Number(row.rating),
    reviewText: row.review_text ?? null,
    createdAt: row.created_at,
    reviewer: {
      userId: row.reviewer_user_id,
      fullName: row.reviewer_full_name ?? undefined,
      avatarUrl: row.reviewer_avatar_url ?? null,
    },
    match: {
      matchId: row.match_id,
      title: row.match_title,
      sport: row.match_sport,
      startsAt: row.match_starts_at,
    },
  };
}

export function toPublicHostRatingAggregate({ reviewCount = 0, avgRating = null } = {}) {
  return {
    reviewCount: Number(reviewCount),
    avgRating: avgRating == null ? null : Number(avgRating),
  };
}
