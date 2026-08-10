export async function findByEmail(client, email) {
  const { rows } = await client.query(
    `SELECT user_id, email, phone_number, role, status
     FROM schema_auth.users
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [email],
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
     RETURNING user_id, email, full_name, phone_number, gender, role, status, created_at`,
    [email, passwordHash, fullName, phoneNumber, gender, role, status],
  );

  return rows[0];
}
