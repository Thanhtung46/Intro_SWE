export async function findReviewableAssignmentForPlayer(
  client,
  { bookingId, playerId },
) {
  const { rows } = await client.query(
    `SELECT
       a.assignment_id,
       a.booking_id,
       a.referee_id,
       a.status AS assignment_status,
       a.fee_vnd,
       b.player_id,
       b.status AS booking_status,
       b.hire_referee,
       lower(b.booking_time_range) AS starts_at,
       upper(b.booking_time_range) AS ends_at,
       v.name AS venue_name
     FROM schema_referee.referee_assignments a
     INNER JOIN schema_booking.bookings b ON b.booking_id = a.booking_id
     INNER JOIN schema_venue.fields f ON f.field_id = b.field_id
     INNER JOIN schema_venue.venues v ON v.venue_id = f.venue_id
     WHERE a.booking_id = $1
       AND b.player_id = $2
       AND b.hire_referee = TRUE
       AND a.status IN ('ACCEPTED', 'COMPLETED')
     ORDER BY a.assignment_id ASC
     LIMIT 1`,
    [bookingId, playerId],
  );
  return rows[0] ?? null;
}

export async function countPlayerRefereeReviewsSince(client, playerId, since) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS count
     FROM schema_review.referee_reviews
     WHERE player_id = $1
       AND created_at >= $2::timestamptz`,
    [playerId, since],
  );
  return rows[0]?.count ?? 0;
}

export async function insertRefereeReview(
  client,
  {
    assignmentId,
    bookingId,
    refereeId,
    playerId,
    rating,
    reviewText,
  },
) {
  const { rows } = await client.query(
    `INSERT INTO schema_review.referee_reviews (
       assignment_id, booking_id, referee_id, player_id, rating, review_text
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING review_id, assignment_id, booking_id, referee_id, player_id,
       rating, review_text, created_at`,
    [assignmentId, bookingId, refereeId, playerId, rating, reviewText ?? null],
  );
  return rows[0];
}

export async function findRefereeReviewById(client, reviewId) {
  const { rows } = await client.query(
    `SELECT review_id, assignment_id, booking_id, referee_id, player_id,
            rating, review_text, created_at
     FROM schema_review.referee_reviews
     WHERE review_id = $1`,
    [reviewId],
  );
  return rows[0] ?? null;
}
