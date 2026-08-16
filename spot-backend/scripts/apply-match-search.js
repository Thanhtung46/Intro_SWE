/**
 * Re-apply 004 (CREATE OR REPLACE / IF NOT EXISTS). migrate.js skips 004
 * once it is in schema_migrations.
 *
 *   docker compose run --rm backend node scripts/apply-match-search.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/shared/database/pool.js';

const sqlPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../migrations/004_match_search_fold.sql',
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
