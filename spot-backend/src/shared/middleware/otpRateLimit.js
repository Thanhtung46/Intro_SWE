import rateLimit from 'express-rate-limit';

function createEmailIpRateLimiter({
  windowMs = 15 * 60 * 1000,
  max = 20,
  message = 'Too many requests. Please try again later.',
} = {}) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const email = String(req.body?.email || '').trim().toLowerCase();
      return `${req.ip}:${email}`;
    },
    message: { message },
    validate: false,
  });
}

export function createOtpRateLimiter(options = {}) {
  return createEmailIpRateLimiter({
    max: 20,
    message: 'Too many OTP requests. Please try again later.',
    ...options,
  });
}

export function createLoginRateLimiter(options = {}) {
  return createEmailIpRateLimiter({
    max: 30,
    message: 'Too many login attempts. Please try again later.',
    ...options,
  });
}

/**
 * Per-authenticated-player rate limiter (must run after `authenticate`).
 * Reused as-is for the assistant conversation endpoints — see
 * specs/003-nlp-assistant/research.md decision 6.
 */
export function createPlayerRateLimiter({
  windowMs = 60 * 1000,
  max = 20,
  message = 'Too many requests. Please try again later.',
} = {}) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `${req.ip}:${req.user?.userId || 'anon'}`,
    message: { message },
    validate: false,
  });
}
