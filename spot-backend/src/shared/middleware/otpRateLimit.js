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
