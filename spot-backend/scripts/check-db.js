import pool from '../src/shared/database/pool.js';
import config from '../src/shared/config/env.js';

function mask(v) {
  if (!v) return '(empty)';
  const s = String(v);
  if (s.length <= 4) return '****';
  return `${s.slice(0, 2)}***${s.slice(-2)}`;
}

console.log('Resolved DB config (masked):');
console.log({
  host: config.database.host || '(none)',
  port: config.database.port || '(none)',
  name: config.database.name || '(none)',
  user: mask(config.database.user),
  password: config.database.password ? 'set' : 'missing',
  ssl: config.database.ssl,
  urlUsed: Boolean(config.database.url),
});

try {
  const t0 = Date.now();
  const r = await pool.query(
    "SELECT current_database() AS db, current_user AS usr, inet_server_addr()::text AS server_addr, NOW() AS now",
  );
  const schemas = await pool.query(
    "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'schema_auth'",
  );
  console.log('CONNECT_OK', {
    ms: Date.now() - t0,
    db: r.rows[0].db,
    user: mask(r.rows[0].usr),
    serverAddr: r.rows[0].server_addr,
    schemaAuth: schemas.rowCount > 0,
  });
  process.exitCode = 0;
} catch (err) {
  console.error('CONNECT_FAIL', {
    code: err.code,
    message: err.message,
  });
  process.exitCode = 1;
} finally {
  await pool.end().catch(() => {});
}
