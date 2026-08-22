import { ZodError } from 'zod';
import logger from '../utils/logger.js';

export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  const pgCode = err?.code;
  if (
    pgCode === '42P01' ||
    pgCode === '42703' ||
    (typeof err?.message === 'string' &&
      (/relation .* does not exist/i.test(err.message) ||
        /column .* does not exist/i.test(err.message)))
  ) {
    logger.error('Database schema mismatch', { err: err.message, code: pgCode });
    return res.status(503).json({
      message:
        'Database schema is out of date. Run `npm run migrate` (migrations 015–024).',
      ...(process.env.NODE_ENV !== 'production' ? { detail: err.message } : {}),
    });
  }

  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ message: 'Invalid JSON body' });
  }

  logger.error('Unhandled error', { err: err.message, stack: err.stack });
  return res.status(500).json({ message: 'Internal server error' });
}
