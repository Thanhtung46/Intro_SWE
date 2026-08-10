export async function findByEmail(client, email) {
  const { rows } = await client.query(
    `SELECT user_id, email, phone_number, role, status,
            email_verified_at, role_selected_at
     FROM schema_auth.users
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [email],
  );
  return rows[0] || null;
}

export async function findAuthByEmail(client, email) {
  const { rows } = await client.query(
    `SELECT user_id, email, full_name, phone_number, gender, role, status,
            password_hash, login_attempts, lockout_until,
            email_verified_at, role_selected_at
     FROM schema_auth.users
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [email],
  );
  return rows[0] || null;
}

export async function recordFailedLogin(client, userId, {
  attempts,
  lockoutUntil = null,
}) {
  const { rows } = await client.query(
    `UPDATE schema_auth.users
     SET login_attempts = $2,
         lockout_until = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
     RETURNING user_id, login_attempts, lockout_until`,
    [userId, attempts, lockoutUntil],
  );
  return rows[0] || null;
}

export async function resetLoginState(client, userId) {
  const { rows } = await client.query(
    `UPDATE schema_auth.users
     SET login_attempts = 0,
         lockout_until = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
     RETURNING user_id, login_attempts, lockout_until`,
    [userId],
  );
  return rows[0] || null;
}

export async function updatePasswordHash(client, userId, passwordHash) {
  const { rows } = await client.query(
    `UPDATE schema_auth.users
     SET password_hash = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
     RETURNING user_id, email`,
    [userId, passwordHash],
  );
  return rows[0] || null;
}

export async function markEmailVerified(client, userId) {
  const { rows } = await client.query(
    `UPDATE schema_auth.users
     SET email_verified_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
     RETURNING user_id, email, email_verified_at`,
    [userId],
  );
  return rows[0] || null;
}

export async function selectRole(client, userId, { role, status }) {
  const { rows } = await client.query(
    `UPDATE schema_auth.users
     SET role = $2,
         status = $3,
         role_selected_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
     RETURNING user_id, email, full_name, phone_number, gender, role, status,
               role_selected_at, email_verified_at, created_at`,
    [userId, role, status],
  );
  return rows[0] || null;
}

export async function findByPhone(client, phoneNumber) {
  const { rows } = await client.query(
    `SELECT user_id, email, phone_number, role, status
     FROM schema_auth.users
     WHERE phone_number = $1
     LIMIT 1`,
    [phoneNumber],
  );
  return rows[0] || null;
}

export async function createUser(client, {
  email,
  passwordHash,
  fullName,
  phoneNumber,
  gender,
  role,
  status,
}) {
  const { rows } = await client.query(
    `INSERT INTO schema_auth.users
      (email, password_hash, full_name, phone_number, gender, role, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING user_id, email, full_name, phone_number, gender, role, status,
               role_selected_at, email_verified_at, created_at`,
    [email, passwordHash, fullName, phoneNumber, gender, role, status],
  );

  return rows[0];
}
