/**
 * One-shot: which DB am I on + Vmito row counts (for debugging env mismatch).
 * Usage: node scripts/check-vmito-db.js
 */
import pool from '../src/shared/database/pool.js';
import config from '../src/shared/config/env.js';
import { vmitoImportMatchSql } from './lib/vmito-parser.js';

const VMITO_MATCH_WHERE = vmitoImportMatchSql('notes');

function mask(v) {
  if (!v) return '(empty)';
  const s = String(v);
  if (s.length <= 4) return '****';
  return `${s.slice(0, 2)}***${s.slice(-2)}`;
}

console.log('=== DB target (from .env / process.env) ===');
console.log({
  host: config.database.host || '(none)',
  port: config.database.port || '(none)',
  name: config.database.name || '(none)',
  user: mask(config.database.user),
  ssl: config.database.ssl,
  urlUsed: Boolean(config.database.url),
});

const conn = await pool.query(`
  SELECT current_database() AS db,
         current_user AS usr,
         inet_server_addr()::text AS server_addr
`);
console.log('\n=== Connected as ===');
console.log(conn.rows[0]);

const schemas = await pool.query(`
  SELECT schema_name FROM information_schema.schemata
  WHERE schema_name IN ('schema_auth', 'schema_matchmaking', 'public')
  ORDER BY 1
`);
console.log('\n=== Schemas present ===');
console.log(schemas.rows.map((r) => r.schema_name));

const matchStats = await pool.query(`
  SELECT COUNT(*)::int AS total,
         MIN(match_id)::int AS min_id,
         MAX(match_id)::int AS max_id,
         COUNT(*) FILTER (WHERE ${VMITO_MATCH_WHERE})::int AS vmito_count,
         MIN(match_id) FILTER (WHERE ${VMITO_MATCH_WHERE})::int AS vmito_min,
         MAX(match_id) FILTER (WHERE ${VMITO_MATCH_WHERE})::int AS vmito_max
  FROM schema_matchmaking.matches
`);
console.log('\n=== schema_matchmaking.matches ===');
console.log(matchStats.rows[0]);

const userStats = await pool.query(`
  SELECT COUNT(*)::int AS total_users,
         MIN(user_id)::int AS min_user_id,
         MAX(user_id)::int AS max_user_id,
         COUNT(*) FILTER (WHERE email LIKE 'vmito.%@import.spot.local')::int AS vmito_hosts,
         MIN(user_id) FILTER (WHERE email LIKE 'vmito.%@import.spot.local')::int AS vmito_host_min,
         MAX(user_id) FILTER (WHERE email LIKE 'vmito.%@import.spot.local')::int AS vmito_host_max
  FROM schema_auth.users
`);
console.log('\n=== schema_auth.users ===');
console.log(userStats.rows[0]);

const sample = await pool.query(`
  SELECT match_id, title, host_user_id
  FROM schema_matchmaking.matches
  WHERE ${VMITO_MATCH_WHERE}
  ORDER BY match_id DESC
  LIMIT 5
`);
console.log('\n=== Sample Vmito matches (latest 5) ===');
console.table(sample.rows);

await pool.end();
