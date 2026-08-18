/**
 * Re-apply province/city (ADD COLUMN IF NOT EXISTS). migrate.js skips 006
 * once recorded.
 *
 *   docker compose run --rm backend node scripts/apply-match-admin.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/shared/database/pool.js';

const sqlPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'sql/match-admin-units.sql',
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
