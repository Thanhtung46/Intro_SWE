import pool from '../../../shared/database/pool.js';
import { USER_STATUSES } from '../../../shared/constants/auth.js';
import { AppError } from '../../../shared/middleware/errorHandler.js';

export function requireActiveOwner() {
  return async (req, res, next) => {
    try {
      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          `SELECT status FROM schema_auth.users WHERE user_id = $1`,
          [req.user.userId],
        );
        const status = rows[0]?.status;
        if (!status) {
          throw new AppError('User not found', 404);
        }
        if (status !== USER_STATUSES.ACTIVE) {
          throw new AppError('Account must be active to access owner console', 403);
        }
        req.user.status = status;
      } finally {
        client.release();
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}
