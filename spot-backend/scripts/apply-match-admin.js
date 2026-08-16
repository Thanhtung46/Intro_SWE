/**
 * Re-apply 005 (ADD COLUMN IF NOT EXISTS / constraint / partial index).
 * migrate.js skips 005 once it is in schema_migrations.
 *
 *   docker compose run --rm backend node scripts/apply-match-admin.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/shared/database/pool.js';

const sqlPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../migrations/005_match_admin_units.sql',
);

const sql = fs.readFileSync(sqlPath, 'utf8');
const client = await pool.connect();
try {
  await client.query(sql);
  console.log('Match admin units (province/city) applied.');
} finally {
  client.release();
  await pool.end();
}
