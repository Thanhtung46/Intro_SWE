import rateLimit from 'express-rate-limit';

export function createOtpRateLimiter({
  windowMs = 15 * 60 * 1000,
  max = 20,
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
    message: { message: 'Too many OTP requests. Please try again later.' },
    validate: false,
  });
}
