/**
 * Clean bad match covers (dev demo):
 * - http → https
 * - clear host-avatar URLs from cover_url (never use people photos as kèo cover)
 * - clear broken fbcdn
 * - leave badminton cover null → mobile shows bundled court photo
 * - football null → keep/set a football stock photo (no bundled asset yet)
 *
 *   npm run backfill:covers
 *   npm run backfill:covers -- --dry-run
 */
import '../src/shared/config/env.js';
import pool from '../src/shared/database/pool.js';

const FOOTBALL_DEFAULT =
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80';

const dryRun = process.argv.includes('--dry-run');
const client = await pool.connect();

try {
  console.log(`backfill-match-covers dryRun=${dryRun}`);

  if (dryRun) {
    const counts = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE cover_url ILIKE 'http://%')::int AS http_urls,
        COUNT(*) FILTER (
          WHERE cover_url ILIKE '%/avatars/%'
             OR cover_url ILIKE '%/avatar%'
             OR cover_url ILIKE '%profile-covers%'
             OR cover_url ILIKE '%externalAuthor%'
        )::int AS avatar_covers,
        COUNT(*) FILTER (WHERE cover_url ILIKE '%fbcdn%')::int AS fbcdn,
        COUNT(*) FILTER (
          WHERE sport = 'FOOTBALL'
            AND (cover_url IS NULL OR btrim(cover_url) = '')
        )::int AS football_null,
        COUNT(*) FILTER (
          WHERE sport = 'BADMINTON'
            AND (cover_url IS NULL OR btrim(cover_url) = '')
        )::int AS badminton_null
      FROM schema_matchmaking.matches
      WHERE status = ANY(ARRAY['OPEN','FULL'])
    `);
    console.log(counts.rows[0]);
  } else {
    const httpFix = await client.query(`
      UPDATE schema_matchmaking.matches
      SET cover_url = regexp_replace(cover_url, '^http://', 'https://')
      WHERE cover_url ILIKE 'http://%'
        AND status = ANY(ARRAY['OPEN','FULL'])
      RETURNING match_id
    `);
    console.log(`http → https: ${httpFix.rowCount}`);

    const avatarClear = await client.query(`
      UPDATE schema_matchmaking.matches
      SET cover_url = NULL
      WHERE status = ANY(ARRAY['OPEN','FULL'])
        AND (
          cover_url ILIKE '%/avatars/%'
          OR cover_url ILIKE '%/avatar/%'
          OR cover_url ILIKE '%profile-covers%'
          OR cover_url ILIKE '%profile_covers%'
        )
      RETURNING match_id
    `);
    console.log(`cleared avatar covers: ${avatarClear.rowCount}`);

    const fbClear = await client.query(`
      UPDATE schema_matchmaking.matches
      SET cover_url = NULL
      WHERE cover_url ILIKE '%fbcdn%'
        AND status = ANY(ARRAY['OPEN','FULL'])
      RETURNING match_id
    `);
    console.log(`cleared fbcdn covers: ${fbClear.rowCount}`);

    const footballFill = await client.query(
      `
      UPDATE schema_matchmaking.matches
      SET cover_url = $1
      WHERE sport = 'FOOTBALL'
        AND status = ANY(ARRAY['OPEN','FULL'])
        AND (cover_url IS NULL OR btrim(cover_url) = '')
      RETURNING match_id
    `,
      [FOOTBALL_DEFAULT],
    );
    console.log(`football null → default: ${footballFill.rowCount}`);

    const badmintonNull = await client.query(`
      SELECT COUNT(*)::int AS n
      FROM schema_matchmaking.matches
      WHERE sport = 'BADMINTON'
        AND status = ANY(ARRAY['OPEN','FULL'])
        AND (cover_url IS NULL OR btrim(cover_url) = '')
    `);
    console.log(
      `badminton without coverUrl (will use app court photo): ${badmintonNull.rows[0].n}`,
    );
  }
} finally {
  client.release();
  await pool.end();
}
