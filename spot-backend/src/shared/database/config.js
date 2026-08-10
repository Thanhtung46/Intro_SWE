import config from '../config/env.js';

export function buildPoolConfig() {
  const { database } = config;

  if (database.url) {
    return {
      connectionString: database.url,
      ssl: database.ssl ? { rejectUnauthorized: false } : false,
      max: database.pool.max,
      min: database.pool.min,
    };
  }

  return {
    host: database.host,
    port: Number(database.port) || 5432,
    database: database.name,
    user: database.user,
    password: database.password,
    ssl: database.ssl ? { rejectUnauthorized: false } : false,
    max: database.pool.max,
    min: database.pool.min,
  };
}
