/**
 * Re-apply search fold + GIN. migrate.js skips 006 once recorded.
 *
 *   docker compose run --rm backend node scripts/apply-match-search.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/shared/database/pool.js';

const sqlPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'sql/match-search-fold.sql',
);

const sql = fs.readFileSync(sqlPath, 'utf8');
const client = await pool.connect();
try {
  await client.query(sql);
  console.log('Match search fold + GIN indexes applied.');
} finally {
  client.release();
  await pool.end();
}
