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
    expiry: process.env.JWT_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  /** Public origin for uploaded avatar URLs (no trailing slash). */
  publicBaseUrl: (
    process.env.PUBLIC_BASE_URL ||
    `http://localhost:${process.env.PORT || 3000}`
  ).replace(/\/$/, ''),

  otp: {
    ttlSeconds: Number(process.env.OTP_TTL_SECONDS) || 300,
    debug:
      process.env.OTP_DEBUG === 'true' || process.env.OTP_DEBUG === '1',
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure:
      process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1',
    user: (process.env.SMTP_USER || '').trim(),
    pass: (process.env.SMTP_PASS || '').trim(),
    from: (
      process.env.EMAIL_FROM ||
      process.env.SMTP_USER ||
      'SPOT <noreply@spot.local>'
    ).trim(),
  },
};

export default config;
