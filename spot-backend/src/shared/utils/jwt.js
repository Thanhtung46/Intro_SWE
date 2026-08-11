import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

function requireSecret() {
  const secret = config.jwt.secret;
  if (!secret || secret === 'your-secret-key-change-in-production') {
    throw new AppError('JWT_SECRET is not configured', 503);
  }
  return secret;
}

export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user.user_id),
      role: user.role,
      email: user.email,
      type: 'access',
    },
    requireSecret(),
    { expiresIn: config.jwt.expiry || '15m' },
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    {
      sub: String(user.user_id),
      role: user.role,
      type: 'refresh',
    },
    requireSecret(),
    { expiresIn: config.jwt.refreshExpiry || '7d' },
  );
}

export function verifyToken(token) {
  return jwt.verify(token, requireSecret());
}

export function getAccessTokenTtlSeconds() {
  const expiry = config.jwt.expiry || '15m';
  const match = String(expiry).match(/^(\d+)([smhd])$/i);
  if (!match) return 900;
  const n = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === 's') return n;
  if (unit === 'm') return n * 60;
  if (unit === 'h') return n * 3600;
  if (unit === 'd') return n * 86400;
  return 900;
}
