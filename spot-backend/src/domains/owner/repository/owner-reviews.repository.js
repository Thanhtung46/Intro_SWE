export async function listReviewsForOwner(
  client,
  ownerId,
  { venueId, rating, hasReply, from, to, limit, offset },
) {
  const params = [ownerId];
  const clauses = ['v.owner_id = $1'];

  if (venueId) {
    params.push(venueId);
    clauses.push(`r.venue_id = $${params.length}`);
  }
  if (rating) {
    params.push(rating);
    clauses.push(`r.rating = $${params.length}`);
  }
  if (hasReply === true) {
    clauses.push('rr.reply_id IS NOT NULL');
  } else if (hasReply === false) {
    clauses.push('rr.reply_id IS NULL');
  }
  if (from) {
    params.push(from);
    clauses.push(`r.created_at >= $${params.length}::date`);
  }
  if (to) {
    params.push(to);
    clauses.push(`r.created_at < ($${params.length}::date + interval '1 day')`);
  }

  const where = clauses.join(' AND ');
  params.push(limit, offset);

  const { rows } = await client.query(
    `SELECT
       r.review_id, r.booking_id, r.venue_id, r.player_id, r.rating,
       r.review_text, r.created_at,
       v.name AS venue_name,
       p.full_name AS player_name,
       rr.reply_id, rr.reply_text, rr.created_at AS reply_created_at
     FROM schema_review.reviews r
     INNER JOIN schema_venue.venues v ON v.venue_id = r.venue_id
     LEFT JOIN schema_auth.user_profiles p ON p.user_id = r.player_id
     LEFT JOIN schema_review.review_replies rr ON rr.review_id = r.review_id
     WHERE ${where}
     ORDER BY r.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  const countParams = params.slice(0, -2);
  const { rows: countRows } = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM schema_review.reviews r
     INNER JOIN schema_venue.venues v ON v.venue_id = r.venue_id
     LEFT JOIN schema_review.review_replies rr ON rr.review_id = r.review_id
     WHERE ${where}`,
    countParams,
  );

  return { rows, total: countRows[0]?.total ?? 0 };
}

export async function findReviewDetailForOwner(client, reviewId, ownerId) {
  const { rows } = await client.query(
    `SELECT
       r.review_id, r.booking_id, r.venue_id, r.player_id, r.rating,
       r.review_text, r.created_at,
       v.name AS venue_name,
       p.full_name AS player_name,
       b.booking_date,
       f.name AS field_name,
       rr.reply_id, rr.reply_text, rr.created_at AS reply_created_at
     FROM schema_review.reviews r
     INNER JOIN schema_venue.venues v ON v.venue_id = r.venue_id
     INNER JOIN schema_booking.bookings b ON b.booking_id = r.booking_id
     INNER JOIN schema_venue.fields f ON f.field_id = b.field_id
     LEFT JOIN schema_auth.user_profiles p ON p.user_id = r.player_id
     LEFT JOIN schema_review.review_replies rr ON rr.review_id = r.review_id
     WHERE r.review_id = $1 AND v.owner_id = $2`,
    [reviewId, ownerId],
  );
  return rows[0] ?? null;
}
