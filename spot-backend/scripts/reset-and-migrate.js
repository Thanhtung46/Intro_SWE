/**
 * Destructive: drop app schemas + migration history, then re-apply squashed migrations.
 * Usage: node scripts/reset-and-migrate.js
 */
import pool from '../src/shared/database/pool.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function reset() {
  const client = await pool.connect();
  try {
    console.log('Dropping schemas (CASCADE) and schema_migrations...');
    await client.query('BEGIN');
    await client.query(`
      DROP SCHEMA IF EXISTS schema_matchmaking CASCADE;
      DROP SCHEMA IF EXISTS schema_review CASCADE;
      DROP SCHEMA IF EXISTS schema_social CASCADE;
      DROP SCHEMA IF EXISTS schema_booking CASCADE;
      DROP SCHEMA IF EXISTS schema_venue CASCADE;
      DROP SCHEMA IF EXISTS schema_notification CASCADE;
      DROP SCHEMA IF EXISTS schema_auth CASCADE;
      DROP TABLE IF EXISTS public.schema_migrations;
    `);
    await client.query('COMMIT');
    console.log('Reset complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

function runMigrate() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(__dirname, 'migrate.js')],
      { stdio: 'inherit', cwd: path.join(__dirname, '..') },
    );
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`migrate exited with code ${code}`));
    });
  });
}

await reset();
await runMigrate();
console.log('Squashed migrations applied.');
