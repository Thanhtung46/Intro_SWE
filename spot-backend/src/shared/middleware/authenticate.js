import { verifyToken } from '../utils/jwt.js';
import { AppError } from './errorHandler.js';

/**
 * Require a valid access JWT in `Authorization: Bearer <token>`.
 * Sets `req.user` = { userId, role, email }.
 */
export function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError('Missing or invalid Authorization header', 401);
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new AppError('Missing or invalid Authorization header', 401);
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw new AppError('Invalid or expired token', 401);
    }

    if (payload.type !== 'access') {
      throw new AppError('Invalid token type', 401);
    }

    req.user = {
      userId: payload.sub,
      role: payload.role,
      email: payload.email,
    };
    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * Require `req.user.role` to be one of the allowed roles.
 * Must run after `authenticate`.
 */
export function requireRole(...roles) {
  const allowed = roles.flat();
  return (req, res, next) => {
    try {
      if (!req.user?.role) {
        throw new AppError('Unauthorized', 401);
      }
      if (!allowed.includes(req.user.role)) {
        throw new AppError('Forbidden', 403);
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}
