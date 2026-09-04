/**
 * Remove only football demo-seed rows — keeps Vmito import + real users.
 *
 *   npm run reset:football
 *   npm run reset:football -- --dry-run
 */
import '../src/shared/config/env.js';
import pool from '../src/shared/database/pool.js';
import {
  FOOTBALL_HOST_EMAIL,
  footballSeedMatchSql,
} from './lib/football-seed-catalog.js';

const MATCH_WHERE = footballSeedMatchSql('notes');
const MATCH_WHERE_M = footballSeedMatchSql('m.notes');

function parseArgs(argv) {
  return { dryRun: argv.includes('--dry-run') };
}

async function main() {
  const { dryRun } = parseArgs(process.argv);
  const client = await pool.connect();

  try {
    const matchStats = (
      await client.query(
        `SELECT COUNT(*)::int AS n,
                MIN(match_id)::int AS min_id,
                MAX(match_id)::int AS max_id
         FROM schema_matchmaking.matches
         WHERE ${MATCH_WHERE}`,
      )
    ).rows[0];

    const hostStats = (
      await client.query(
        `SELECT COUNT(*)::int AS n
         FROM schema_auth.users u
         WHERE u.email LIKE $1
           AND NOT EXISTS (
             SELECT 1 FROM schema_matchmaking.matches m
             WHERE m.host_user_id = u.user_id
               AND NOT (${MATCH_WHERE_M})
           )`,
        [FOOTBALL_HOST_EMAIL],
      )
    ).rows[0];

    console.log('=== reset:football (demo seed only) ===');
    console.log(`dryRun: ${dryRun}`);
    console.log('Matches to delete:', matchStats);
    console.log('Shadow hosts to delete:', hostStats);
    console.log('NOT touched: Vmito import, smoke/manual kèo, real users');

    if (dryRun) {
      console.log('\nDry run — no DB changes.');
      return;
    }

    await client.query('BEGIN');
    const deletedMatches = (
      await client.query(
        `DELETE FROM schema_matchmaking.matches
         WHERE ${MATCH_WHERE}
         RETURNING match_id`,
      )
    ).rows;
    const deletedHosts = (
      await client.query(
        `DELETE FROM schema_auth.users u
         WHERE u.email LIKE $1
           AND NOT EXISTS (
             SELECT 1 FROM schema_matchmaking.matches m
             WHERE m.host_user_id = u.user_id
           )
         RETURNING u.user_id, u.email`,
        [FOOTBALL_HOST_EMAIL],
      )
    ).rows;
    await client.query('COMMIT');

    console.log(`\nDeleted matches: ${deletedMatches.length}`);
    console.log(`Deleted hosts: ${deletedHosts.length}`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
