import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Always load spot-backend/.env (not cwd), and let it win over shell env vars
dotenv.config({
  path: path.resolve(__dirname, '../../../.env'),
  override: true,
});

function resolveDbSsl(host, url) {
  if (process.env.DB_SSL !== undefined && process.env.DB_SSL !== '') {
    return process.env.DB_SSL === 'true' || process.env.DB_SSL === '1';
  }

  return (
    String(host || '').includes('supabase.co') ||
    String(url || '').includes('supabase.co') ||
    String(url || '').includes('sslmode=require')
  );
}

// Prefer explicit DB_* from .env; only use DATABASE_URL when DB_HOST is absent
const databaseUrl = (process.env.DATABASE_URL || '').trim();
const dbHost = (process.env.DB_HOST || '').trim();

const config = {
  node_env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  log_level: process.env.LOG_LEVEL || 'info',

  database: {
    url: dbHost ? '' : databaseUrl,
    host: dbHost || undefined,
    port: process.env.DB_PORT,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: resolveDbSsl(dbHost, databaseUrl),
    logging: process.env.NODE_ENV === 'development',
    pool: { min: 0, max: Number(process.env.DB_POOL_MAX) || 5 },
  },

  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    db: process.env.REDIS_DB,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiry: process.env.JWT_EXPIRY,
  },

  otp: {
    ttlSeconds: Number(process.env.OTP_TTL_SECONDS) || 300,
  },
};

export default config;
