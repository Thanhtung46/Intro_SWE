/**
 * Remove only Vmito import rows — keeps manual/smoke kèo and real users.
 *
 *   npm run reset:vmito              # delete Vmito matches + orphan shadow hosts
 *   npm run reset:vmito -- --dry-run # preview counts only
 */
import '../src/shared/config/env.js';
import pool from '../src/shared/database/pool.js';
import {
  vmitoImportMatchSql,
} from './lib/vmito-parser.js';

const VMITO_HOST_EMAIL = 'vmito.%@import.spot.local';
const VMITO_MATCH_WHERE = vmitoImportMatchSql('notes');
const VMITO_MATCH_WHERE_M = vmitoImportMatchSql('m.notes');

function parseArgs(argv) {
  return { dryRun: argv.includes('--dry-run') };
}

async function countVmitoMatches(client) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS n,
            MIN(match_id)::int AS min_id,
            MAX(match_id)::int AS max_id
     FROM schema_matchmaking.matches
     WHERE ${VMITO_MATCH_WHERE}`,
  );
  return rows[0];
}

async function countOrphanVmitoHosts(client) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS n,
            MIN(u.user_id)::int AS min_id,
            MAX(u.user_id)::int AS max_id
     FROM schema_auth.users u
     WHERE u.email LIKE $1
       AND NOT EXISTS (
         SELECT 1 FROM schema_matchmaking.matches m
         WHERE m.host_user_id = u.user_id
           AND NOT (${VMITO_MATCH_WHERE_M})
       )`,
    [VMITO_HOST_EMAIL],
  );
  return rows[0];
}

async function deleteVmitoMatches(client) {
  const { rows } = await client.query(
    `DELETE FROM schema_matchmaking.matches
     WHERE ${VMITO_MATCH_WHERE}
     RETURNING match_id`,
  );
  return rows.map((row) => row.match_id);
}

async function deleteOrphanVmitoHosts(client) {
  const { rows } = await client.query(
    `DELETE FROM schema_auth.users u
     WHERE u.email LIKE $1
       AND NOT EXISTS (
         SELECT 1 FROM schema_matchmaking.matches m
         WHERE m.host_user_id = u.user_id
       )
     RETURNING u.user_id, u.email`,
    [VMITO_HOST_EMAIL],
  );
  return rows;
}

async function main() {
  const { dryRun } = parseArgs(process.argv);
  const client = await pool.connect();

  try {
    const matchStats = await countVmitoMatches(client);
    const hostStats = await countOrphanVmitoHosts(client);

    console.log('=== reset:vmito (Vmito import only) ===');
    console.log(`dryRun: ${dryRun}`);
    console.log('Matches to delete (import tag or legacy Vmito URL in notes):', matchStats);
    console.log('Shadow hosts to delete (only host Vmito kèo, or no kèo left):', hostStats);
    console.log('');
    console.log('NOT touched: other matches, real users (register/OTP), groups, tournaments');

    if (dryRun) {
      console.log('\nDry run — no DB changes.');
      return;
    }

    await client.query('BEGIN');
    const deletedMatchIds = await deleteVmitoMatches(client);
    const deletedHosts = await deleteOrphanVmitoHosts(client);
    await client.query('COMMIT');

    console.log('\nDeleted matches:', deletedMatchIds.length);
    if (deletedMatchIds.length) {
      console.log(
        `  match_id range: ${Math.min(...deletedMatchIds)} – ${Math.max(...deletedMatchIds)}`,
      );
    }
    console.log('Deleted shadow hosts:', deletedHosts.length);
    for (const row of deletedHosts) {
      console.log(`  user_id ${row.user_id} ${row.email}`);
    }
    console.log('\nYou can re-import: npm run sync:vmito');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
