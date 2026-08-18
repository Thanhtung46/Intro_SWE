import pool from '../src/shared/database/pool.js';

const client = await pool.connect();
try {
  await client.query(
    'TRUNCATE TABLE schema_matchmaking.matches RESTART IDENTITY CASCADE',
  );
  console.log('Truncated schema_matchmaking.matches (courts, join requests, guests reset).');
} finally {
  client.release();
  await pool.end();
}
