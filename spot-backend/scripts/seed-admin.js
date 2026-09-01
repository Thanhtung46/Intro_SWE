/**
 * Seed or update a System Administrator account.
 * Env: ADMIN_SEED_EMAIL, ADMIN_SEED_PASSWORD, ADMIN_SEED_PHONE (optional),
 *      ADMIN_SEED_FULL_NAME (optional).
 */
import '../src/shared/config/env.js';
import pool from '../src/shared/database/pool.js';
import { hashPassword } from '../src/shared/utils/password.js';
import { USER_ROLES, USER_STATUSES } from '../src/shared/constants/auth.js';

const email = (process.env.ADMIN_SEED_EMAIL || 'admin@spot.local').toLowerCase();
const password = process.env.ADMIN_SEED_PASSWORD || 'AdminPass1!';
const phoneNumber = process.env.ADMIN_SEED_PHONE || '0900000001';
const fullName = process.env.ADMIN_SEED_FULL_NAME || 'SPOT Administrator';

async function main() {
  const passwordHash = await hashPassword(password);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT user_id FROM schema_auth.users WHERE lower(email) = lower($1) LIMIT 1`,
      [email],
    );

    let userId;
    if (existing.rows[0]) {
      userId = existing.rows[0].user_id;
      await client.query(
        `UPDATE schema_auth.users
         SET password_hash = $2,
             phone_number = $3,
             role = $4,
             status = $5,
             email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP),
             role_selected_at = COALESCE(role_selected_at, CURRENT_TIMESTAMP),
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1`,
        [
          userId,
          passwordHash,
          phoneNumber,
          USER_ROLES.ADMIN,
          USER_STATUSES.ACTIVE,
        ],
      );
    } else {
      const inserted = await client.query(
        `INSERT INTO schema_auth.users
           (email, password_hash, phone_number, role, status,
            email_verified_at, role_selected_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING user_id`,
        [
          email,
          passwordHash,
          phoneNumber,
          USER_ROLES.ADMIN,
          USER_STATUSES.ACTIVE,
        ],
      );
      userId = inserted.rows[0].user_id;
    }

    await client.query(
      `INSERT INTO schema_auth.user_profiles (user_id, full_name, gender)
       VALUES ($1, $2, 'male')
       ON CONFLICT (user_id) DO UPDATE
         SET full_name = EXCLUDED.full_name,
             updated_at = CURRENT_TIMESTAMP`,
      [userId, fullName],
    );

    await client.query('COMMIT');

    console.log(JSON.stringify({
      message: 'Admin user ready',
      userId,
      email,
      role: USER_ROLES.ADMIN,
      status: USER_STATUSES.ACTIVE,
    }, null, 2));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
