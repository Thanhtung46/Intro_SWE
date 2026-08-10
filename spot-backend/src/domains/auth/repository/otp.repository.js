export async function createOtpVerification(client, {
  userId,
  otpCodeHash,
  expiresAt,
  purpose,
}) {
  const { rows } = await client.query(
    `INSERT INTO schema_auth.otp_verifications
      (user_id, otp_code, expires_at, purpose)
     VALUES ($1, $2, $3, $4)
     RETURNING otp_id, user_id, expires_at, purpose, is_used, created_at`,
    [userId, otpCodeHash, expiresAt, purpose],
  );
  return rows[0];
}

export async function findLatestActiveOtp(client, { userId, purpose }) {
  const { rows } = await client.query(
    `SELECT otp_id, user_id, otp_code, expires_at, purpose, is_used, created_at
     FROM schema_auth.otp_verifications
     WHERE user_id = $1
       AND purpose = $2
       AND is_used = FALSE
       AND expires_at > CURRENT_TIMESTAMP
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, purpose],
  );
  return rows[0] || null;
}

export async function markOtpUsed(client, otpId) {
  const { rows } = await client.query(
    `UPDATE schema_auth.otp_verifications
     SET is_used = TRUE
     WHERE otp_id = $1
     RETURNING otp_id, is_used`,
    [otpId],
  );
  return rows[0] || null;
}

export async function invalidateUnusedOtps(client, { userId, purpose }) {
  const { rowCount } = await client.query(
    `UPDATE schema_auth.otp_verifications
     SET is_used = TRUE
     WHERE user_id = $1
       AND purpose = $2
       AND is_used = FALSE`,
    [userId, purpose],
  );
  return rowCount;
}
