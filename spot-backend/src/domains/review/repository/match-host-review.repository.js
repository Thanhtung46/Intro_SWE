export async function insert(client, {
  matchId,
  reviewerUserId,
  hostUserId,
  rating,
  reviewText = null,
}) {
  const { rows } = await client.query(
    `INSERT INTO schema_review.match_host_reviews (
       match_id, reviewer_user_id, host_user_id, rating, review_text
     ) VALUES ($1, $2, $3, $4, $5)
     RETURNING review_id, match_id, reviewer_user_id, host_user_id,
               rating, review_text, created_at, updated_at`,
    [matchId, reviewerUserId, hostUserId, rating, reviewText],
  );
  return rows[0];
}

export async function findByMatchAndReviewer(client, matchId, reviewerUserId) {
  const { rows } = await client.query(
    `SELECT review_id, match_id, reviewer_user_id, host_user_id,
            rating, review_text, created_at, updated_at
     FROM schema_review.match_host_reviews
     WHERE match_id = $1
       AND reviewer_user_id = $2
     LIMIT 1`,
    [matchId, reviewerUserId],
  );
  return rows[0] || null;
}

export async function countByReviewerSince(client, reviewerUserId, since) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM schema_review.match_host_reviews
     WHERE reviewer_user_id = $1
       AND created_at >= $2`,
    [reviewerUserId, since],
  );
  return rows[0]?.total ?? 0;
}

export async function getHostAggregate(client, hostUserId) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS review_count,
            ROUND(AVG(rating)::numeric, 1) AS avg_rating
     FROM schema_review.match_host_reviews
     WHERE host_user_id = $1`,
    [hostUserId],
  );
  const row = rows[0] || {};
  const reviewCount = Number(row.review_count ?? 0);
  return {
    reviewCount,
    avgRating:
      reviewCount > 0 && row.avg_rating != null
        ? Number(row.avg_rating)
        : null,
  };
}

export async function getHostAggregatesForUsers(client, hostUserIds) {
  if (!hostUserIds.length) {
    return new Map();
  }
  const { rows } = await client.query(
    `SELECT host_user_id,
            COUNT(*)::int AS review_count,
            ROUND(AVG(rating)::numeric, 1) AS avg_rating
     FROM schema_review.match_host_reviews
     WHERE host_user_id = ANY($1::int[])
     GROUP BY host_user_id`,
    [hostUserIds],
  );
  return new Map(
    rows.map((row) => [
      Number(row.host_user_id),
      {
        reviewCount: Number(row.review_count ?? 0),
        avgRating:
          Number(row.review_count ?? 0) > 0 && row.avg_rating != null
            ? Number(row.avg_rating)
            : null,
      },
    ]),
  );
}

export async function listByHost(client, hostUserId, { limit, offset }) {
  const { rows } = await client.query(
    `SELECT r.review_id,
            r.match_id,
            r.reviewer_user_id,
            r.host_user_id,
            r.rating,
            r.review_text,
            r.created_at,
            m.title AS match_title,
            m.sport AS match_sport,
            m.starts_at AS match_starts_at,
            p.full_name AS reviewer_full_name,
            p.avatar_url AS reviewer_avatar_url
     FROM schema_review.match_host_reviews r
     INNER JOIN schema_matchmaking.matches m ON m.match_id = r.match_id
     LEFT JOIN schema_auth.user_profiles p ON p.user_id = r.reviewer_user_id
     WHERE r.host_user_id = $1
     ORDER BY r.created_at DESC, r.review_id DESC
     LIMIT $2 OFFSET $3`,
    [hostUserId, limit, offset],
  );
  return rows;
}

export async function countByHost(client, hostUserId) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM schema_review.match_host_reviews
     WHERE host_user_id = $1`,
    [hostUserId],
  );
  return rows[0]?.total ?? 0;
}
