const USER_PROFILE_SELECT = `u.user_id, u.email, p.full_name, u.phone_number, p.gender,
               u.role, u.status,
               p.avatar_url, p.language, p.appearance,
               p.push_notifications_enabled, p.location_services_enabled,
               u.email_verified_at, u.role_selected_at, u.created_at`;

const USER_PROFILE_FROM = `schema_auth.users u
     INNER JOIN schema_auth.user_profiles p ON p.user_id = u.user_id`;

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

export async function findById(client, userId) {
  const { rows } = await client.query(
    `SELECT ${USER_PROFILE_SELECT}
     FROM ${USER_PROFILE_FROM}
     WHERE u.user_id = $1
     LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
}

export async function findAuthByEmail(client, email) {
  const { rows } = await client.query(
    `SELECT ${USER_PROFILE_SELECT},
            u.password_hash, u.login_attempts, u.lockout_until
     FROM ${USER_PROFILE_FROM}
     WHERE lower(u.email) = lower($1)
     LIMIT 1`,
    [email],
  );
  return rows[0] || null;
}

export async function findPasswordHashById(client, userId) {
  const { rows } = await client.query(
    `SELECT user_id, password_hash
     FROM schema_auth.users
     WHERE user_id = $1
     LIMIT 1`,
    [userId],
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
  await client.query(
    `UPDATE schema_auth.users
     SET role = $2,
         status = $3,
         role_selected_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1`,
    [userId, role, status],
  );
  return findById(client, userId);
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
      (email, password_hash, phone_number, role, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING user_id`,
    [email, passwordHash, phoneNumber, role, status],
  );

  const userId = rows[0].user_id;

  await client.query(
    `INSERT INTO schema_auth.user_profiles
      (user_id, full_name, gender)
     VALUES ($1, $2, $3)`,
    [userId, fullName, gender],
  );

  return findById(client, userId);
}

export async function updateProfile(client, userId, {
  fullName,
  gender,
  avatarUrl,
  language,
  appearance,
  pushNotificationsEnabled,
  locationServicesEnabled,
}) {
  const sets = [];
  const values = [userId];

  if (fullName !== undefined) {
    values.push(fullName);
    sets.push(`full_name = $${values.length}`);
  }
  if (gender !== undefined) {
    values.push(gender);
    sets.push(`gender = $${values.length}`);
  }
  if (avatarUrl !== undefined) {
    values.push(avatarUrl);
    sets.push(`avatar_url = $${values.length}`);
  }
  if (language !== undefined) {
    values.push(language);
    sets.push(`language = $${values.length}`);
  }
  if (appearance !== undefined) {
    values.push(appearance);
    sets.push(`appearance = $${values.length}`);
  }
  if (pushNotificationsEnabled !== undefined) {
    values.push(pushNotificationsEnabled);
    sets.push(`push_notifications_enabled = $${values.length}`);
  }
  if (locationServicesEnabled !== undefined) {
    values.push(locationServicesEnabled);
    sets.push(`location_services_enabled = $${values.length}`);
  }

  if (sets.length === 0) {
    return findById(client, userId);
  }

  sets.push('updated_at = CURRENT_TIMESTAMP');

  await client.query(
    `UPDATE schema_auth.user_profiles
     SET ${sets.join(', ')}
     WHERE user_id = $1`,
    values,
  );
  return findById(client, userId);
}

export async function updateEmail(client, userId, email) {
  await client.query(
    `UPDATE schema_auth.users
     SET email = $2,
         email_verified_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1`,
    [userId, email],
  );
  return findById(client, userId);
}

export async function updatePhone(client, userId, phoneNumber) {
  await client.query(
    `UPDATE schema_auth.users
     SET phone_number = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1`,
    [userId, phoneNumber],
  );
  return findById(client, userId);
}
