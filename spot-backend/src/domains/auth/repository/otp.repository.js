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
