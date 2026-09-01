import pool from '../database/pool.js';
import { AppError } from './errorHandler.js';
import { USER_STATUSES } from '../constants/auth.js';
import * as userRepository from '../../domains/auth/repository/user.repository.js';

/**
 * Require authenticated user with status ACTIVE (for referee operational routes).
 */
export async function requireActiveUser(req, res, next) {
  const client = await pool.connect();
  try {
    const user = await userRepository.findById(client, req.user.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    if (user.status !== USER_STATUSES.ACTIVE) {
      throw new AppError('Account is not active', 403, { status: user.status });
    }
    req.accountUser = user;
    return next();
  } catch (err) {
    return next(err);
  } finally {
    client.release();
  }
}
