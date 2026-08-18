/**
 * One-shot for live DB (venues table already created before this feature's
 * location/opening_hours/closing_hours columns existed, so migrate's
 * CREATE TABLE IF NOT EXISTS on 004 skips it).
 * Safe to re-run: IF NOT EXISTS.
 *
 *   npm run apply:venue-location
 *   docker compose run --rm backend npm run apply:venue-location
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/shared/database/pool.js';

const sqlPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'sql/venue-location.sql',
);

const sql = fs.readFileSync(sqlPath, 'utf8');
const client = await pool.connect();
try {
  await client.query(sql);
  console.log('Venue location/hours schema applied.');
} finally {
  client.release();
  await pool.end();
}
