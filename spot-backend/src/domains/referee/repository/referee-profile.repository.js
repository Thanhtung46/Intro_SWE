export async function upsertProfile(client, userId, certifiedSportTypes) {
  const { rows } = await client.query(
    `INSERT INTO schema_referee.referee_profiles
       (user_id, certified_sport_types)
     VALUES ($1, $2::text[])
     ON CONFLICT (user_id) DO UPDATE
       SET certified_sport_types = EXCLUDED.certified_sport_types,
           updated_at = CURRENT_TIMESTAMP
     RETURNING user_id, certified_sport_types, total_matches_officiated,
               avg_rating, rating_count, created_at, updated_at`,
    [userId, certifiedSportTypes],
  );
  return rows[0];
}

export async function findByUserId(client, userId) {
  const { rows } = await client.query(
    `SELECT user_id, certified_sport_types, total_matches_officiated,
            avg_rating, rating_count, activation_ack_at, created_at, updated_at
     FROM schema_referee.referee_profiles
     WHERE user_id = $1`,
    [userId],
  );
  return rows[0] ?? null;
}

/**
 * Idempotently stamp the referee's one-time "Account Activated" acknowledgement.
 * COALESCE keeps the first timestamp on repeat calls (fire-and-forget from FE).
 */
export async function markActivationAck(client, userId) {
  const { rows } = await client.query(
    `UPDATE schema_referee.referee_profiles
     SET activation_ack_at = COALESCE(activation_ack_at, CURRENT_TIMESTAMP)
     WHERE user_id = $1
     RETURNING user_id, activation_ack_at`,
    [userId],
  );
  return rows[0] ?? null;
}

export async function incrementMatchesOfficiated(client, userId, count = 1) {
  const { rows } = await client.query(
    `UPDATE schema_referee.referee_profiles
     SET total_matches_officiated = total_matches_officiated + $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
     RETURNING user_id, certified_sport_types, total_matches_officiated,
               avg_rating, rating_count, created_at, updated_at`,
    [userId, count],
  );
  return rows[0] ?? null;
}

export async function refreshRefereeRating(client, refereeId) {
  const { rows } = await client.query(
    `UPDATE schema_referee.referee_profiles p
     SET
       avg_rating = COALESCE(agg.avg_rating, 0),
       rating_count = COALESCE(agg.rating_count, 0),
       updated_at = CURRENT_TIMESTAMP
     FROM (
       SELECT
         ROUND(AVG(rating)::numeric, 2) AS avg_rating,
         COUNT(*)::int AS rating_count
       FROM schema_review.referee_reviews
       WHERE referee_id = $1
     ) agg
     WHERE p.user_id = $1
     RETURNING p.user_id, p.certified_sport_types, p.total_matches_officiated,
               p.avg_rating, p.rating_count, p.created_at, p.updated_at`,
    [refereeId],
  );
  return rows[0] ?? null;
}

export async function getRefereeRating(client, refereeId) {
  const { rows } = await client.query(
    `SELECT user_id, avg_rating, rating_count, total_matches_officiated
     FROM schema_referee.referee_profiles
     WHERE user_id = $1`,
    [refereeId],
  );
  return rows[0] ?? null;
}
