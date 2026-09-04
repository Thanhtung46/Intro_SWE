export async function findCompletedBookingForPlayer(
  client,
  { bookingId, playerId },
) {
  const { rows } = await client.query(
    `SELECT
       b.booking_id,
       b.player_id,
       b.status,
       f.field_id,
       f.venue_id,
       v.owner_id AS venue_owner_id
     FROM schema_booking.bookings b
     INNER JOIN schema_venue.fields f ON f.field_id = b.field_id
     INNER JOIN schema_venue.venues v ON v.venue_id = f.venue_id
     WHERE b.booking_id = $1
       AND b.player_id = $2`,
    [bookingId, playerId],
  );
  return rows[0] ?? null;
}

export async function countPlayerReviewsSince(client, playerId, since) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS count
     FROM schema_review.reviews
     WHERE player_id = $1
       AND created_at >= $2::timestamptz`,
    [playerId, since],
  );
  return rows[0]?.count ?? 0;
}

export async function insertReview(
  client,
  { bookingId, venueId, playerId, rating, reviewText },
) {
  const { rows } = await client.query(
    `INSERT INTO schema_review.reviews (
       booking_id, venue_id, player_id, rating, review_text
     )
     VALUES ($1, $2, $3, $4, $5)
     RETURNING review_id, booking_id, venue_id, player_id, rating,
       review_text, created_at`,
    [bookingId, venueId, playerId, rating, reviewText ?? null],
  );
  return rows[0];
}

export async function refreshVenueRating(client, venueId) {
  const { rows } = await client.query(
    `UPDATE schema_venue.venues v
     SET
       avg_rating = COALESCE(agg.avg_rating, 0),
       rating_count = COALESCE(agg.rating_count, 0),
       updated_at = CURRENT_TIMESTAMP
     FROM (
       SELECT
         ROUND(AVG(rating)::numeric, 2) AS avg_rating,
         COUNT(*)::int AS rating_count
       FROM schema_review.reviews
       WHERE venue_id = $1
     ) agg
     WHERE v.venue_id = $1
     RETURNING v.venue_id, v.avg_rating, v.rating_count`,
    [venueId],
  );
  return rows[0];
}

export async function findReviewById(client, reviewId) {
  const { rows } = await client.query(
    `SELECT
       r.review_id,
       r.booking_id,
       r.venue_id,
       r.player_id,
       r.rating,
       r.review_text,
       r.created_at,
       v.owner_id AS venue_owner_id
     FROM schema_review.reviews r
     INNER JOIN schema_venue.venues v ON v.venue_id = r.venue_id
     WHERE r.review_id = $1`,
    [reviewId],
  );
  return rows[0] ?? null;
}

export async function findReplyByReviewId(client, reviewId) {
  const { rows } = await client.query(
    `SELECT reply_id, review_id, owner_id, reply_text, created_at
     FROM schema_review.review_replies
     WHERE review_id = $1`,
    [reviewId],
  );
  return rows[0] ?? null;
}

export async function insertReply(client, { reviewId, ownerId, replyText }) {
  const { rows } = await client.query(
    `INSERT INTO schema_review.review_replies (review_id, owner_id, reply_text)
     VALUES ($1, $2, $3)
     RETURNING reply_id, review_id, owner_id, reply_text, created_at`,
    [reviewId, ownerId, replyText],
  );
  return rows[0];
}

/** Player-facing review list for a venue's detail screen (Reviews tab). */
export async function listReviewsForVenue(client, venueId, { limit, offset }) {
  const { rows } = await client.query(
    `SELECT
       r.review_id, r.booking_id, r.venue_id, r.player_id, r.rating,
       r.review_text, r.created_at,
       p.full_name AS player_name,
       p.avatar_url AS player_avatar_url,
       rr.reply_id, rr.reply_text, rr.created_at AS reply_created_at
     FROM schema_review.reviews r
     LEFT JOIN schema_auth.user_profiles p ON p.user_id = r.player_id
     LEFT JOIN schema_review.review_replies rr ON rr.review_id = r.review_id
     WHERE r.venue_id = $1
     ORDER BY r.created_at DESC
     LIMIT $2 OFFSET $3`,
    [venueId, limit, offset],
  );

  const { rows: countRows } = await client.query(
    `SELECT COUNT(*)::int AS total FROM schema_review.reviews WHERE venue_id = $1`,
    [venueId],
  );

  return { rows, total: countRows[0]?.total ?? 0 };
}

export async function getVenueRating(client, venueId) {
  const { rows } = await client.query(
    `SELECT venue_id, avg_rating, rating_count
     FROM schema_venue.venues
     WHERE venue_id = $1`,
    [venueId],
  );
  return rows[0] ?? null;
}

/** Dev seed: mark an existing booking COMPLETED. */
export async function markBookingCompleted(client, bookingId, playerId) {
  const { rows } = await client.query(
    `UPDATE schema_booking.bookings
     SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP
     WHERE booking_id = $1
       AND player_id = $2
     RETURNING booking_id, status, player_id, field_id`,
    [bookingId, playerId],
  );
  return rows[0] ?? null;
}
