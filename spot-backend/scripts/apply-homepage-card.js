/**
 * One-shot for live DB (001/003 already applied, so migrate skips them).
 * Safe to re-run: IF NOT EXISTS.
 *
 *   npm run apply:homepage-card
 *   docker compose run --rm backend npm run apply:homepage-card
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/shared/database/pool.js';

const sqlPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'sql/homepage-card.sql',
);

const sql = fs.readFileSync(sqlPath, 'utf8');
const client = await pool.connect();
try {
  await client.query(sql);
  console.log('Homepage card schema applied.');
} finally {
  client.release();
  await pool.end();
}
