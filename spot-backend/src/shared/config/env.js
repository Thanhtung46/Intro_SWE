import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Docker Compose's `environment:` block sets REDIS_HOST=redis before this
// process even starts (so the backend container reaches the `redis`
// service, not itself). .env's override:true below is needed so DB_*/JWT
// creds always win over stray shell vars — but that same override was also
// clobbering Docker's REDIS_HOST with .env's localhost-oriented value,
// making Redis unreachable in Docker (ECONNREFUSED ::1:6379) while still
// soft-failing silently (OTP/rating caching). Preserve Redis vars that were
// already set (i.e. by Docker) before .env can override them.
// Same clobbering problem also hit the AI-service URLs: Docker Compose sets
// these to their in-network service names (http://nlp:5003, etc.) via
// `environment:`, but spot-backend/.env pins the localhost-oriented values
// needed for running node directly (no Docker) — override:true below was
// silently reverting Docker's values back to localhost, making the
// assistant/recommendation proxies unreachable in Docker
// (ECONNREFUSED ::1:5003) despite both containers being healthy.
const preDotenvOverrides = {
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT,
  REDIS_DB: process.env.REDIS_DB,
  NLP_SERVICE_URL: process.env.NLP_SERVICE_URL,
  RECOMMENDATION_SERVICE_URL: process.env.RECOMMENDATION_SERVICE_URL,
  NOSHOW_SERVICE_URL: process.env.NOSHOW_SERVICE_URL,
};

// Always load spot-backend/.env (not cwd), and let it win over shell env vars
dotenv.config({
  path: path.resolve(__dirname, '../../../.env'),
  override: true,
});

for (const [key, value] of Object.entries(preDotenvOverrides)) {
  if (value !== undefined) {
    process.env[key] = value;
  }
}

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

  /** Public origin for locally-served uploads (avatars, verification docs — no trailing slash). */
  publicBaseUrl: (
    process.env.PUBLIC_BASE_URL ||
    `http://localhost:${process.env.PORT || 3000}`
  ).replace(/\/$/, ''),

  /** Supabase Storage — used for facility/venue photos so uploads survive
   * server restarts/redeploys (local disk under uploads/ does not). */
  supabase: {
    url: (process.env.SUPABASE_URL || '').trim(),
    serviceRoleKey: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'spot-uploads',
  },

  assistant: {
    nlpServiceUrl: process.env.NLP_SERVICE_URL || 'http://localhost:5003',
    internalServiceKey: process.env.INTERNAL_SERVICE_KEY || '',
  },

  recommendation: {
    serviceUrl: process.env.RECOMMENDATION_SERVICE_URL || 'http://localhost:5001',
    // Same shared secret as `assistant` above — both AI-service proxies
    // trust the one INTERNAL_SERVICE_KEY value (see spot-backend/.env.example).
    internalServiceKey: process.env.INTERNAL_SERVICE_KEY || '',
  },

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
