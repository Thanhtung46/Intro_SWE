import pool from '../../../shared/database/pool.js';
import redis from '../../../shared/database/redis.js';
import {
  USER_ROLES,
  USER_STATUSES,
  OTP_PURPOSES,
  OTP_TTL_SECONDS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_EMAIL_REDIS_PREFIX,
  OTP_ATTEMPTS_REDIS_PREFIX,
  OTP_RESEND_REDIS_PREFIX,
} from '../../../shared/constants/auth.js';
import { hashPassword } from '../../../shared/utils/password.js';
import {
  generateOtpCode,
  hashOtpCode,
  verifyOtpCode,
} from '../../../shared/utils/otp.js';
import { sendOtpEmail } from '../../../shared/utils/mailer.js';
import logger from '../../../shared/utils/logger.js';
import { AppError } from '../../../shared/middleware/errorHandler.js';
import * as userRepository from '../repository/user.repository.js';
import * as otpRepository from '../repository/otp.repository.js';
import { toPublicUser } from '../entity/user.entity.js';
import config from '../../../shared/config/env.js';

async function ensureRedis() {
  if (redis.status === 'ready') {
    return;
  }
  if (redis.status === 'connecting' || redis.status === 'connect') {
    return;
  }
  if (redis.status === 'wait' || redis.status === 'end' || redis.status === 'close') {
    await redis.connect();
  }
}

function attemptsKey(email, purpose) {
  return `${OTP_ATTEMPTS_REDIS_PREFIX}${email.toLowerCase()}:${purpose}`;
}

function resendKey(email, purpose) {
  return `${OTP_RESEND_REDIS_PREFIX}${email.toLowerCase()}:${purpose}`;
}

function withDebugOtp(payload, otp) {
  if (config.otp.debug && config.node_env !== 'production') {
    return { ...payload, debugOtp: otp };
  }
  return payload;
}

async function deliverOtpEmail({ email, otp, purpose }) {
  await sendOtpEmail({
    email,
    otp,
    purpose,
    ttlSeconds: OTP_TTL_SECONDS,
  });
}

async function getAttemptCount(email, purpose) {
  try {
    await ensureRedis();
    const raw = await redis.get(attemptsKey(email, purpose));
    return Number(raw) || 0;
  } catch (err) {
    logger.warn('Failed to read OTP attempt count', { error: err.message });
    return 0;
  }
}

async function incrementAttemptCount(email, purpose) {
  try {
    await ensureRedis();
    const key = attemptsKey(email, purpose);
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, OTP_TTL_SECONDS);
    }
    return count;
  } catch (err) {
    logger.warn('Failed to increment OTP attempt count', { error: err.message });
    return 0;
  }
}

async function clearOtpRedisState(userId, email, purpose) {
  try {
    await ensureRedis();
    await redis.del(
      `${OTP_EMAIL_REDIS_PREFIX}${userId}`,
      attemptsKey(email, purpose),
    );
  } catch (err) {
    logger.warn('Failed to clear OTP Redis state', { error: err.message });
  }
}

async function assertResendAllowed(email, purpose) {
  try {
    await ensureRedis();
    const ttl = await redis.ttl(resendKey(email, purpose));
    if (ttl > 0) {
      throw new AppError('Please wait before requesting a new OTP', 429, {
        retryAfterSeconds: ttl,
      });
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.warn('Failed to check OTP resend cooldown', { error: err.message });
  }
}

async function setResendCooldown(email, purpose) {
  try {
    await ensureRedis();
    await redis.set(
      resendKey(email, purpose),
      '1',
      'EX',
      OTP_RESEND_COOLDOWN_SECONDS,
    );
  } catch (err) {
    logger.warn('Failed to set OTP resend cooldown', { error: err.message });
  }
}

export async function registerPlayer(input) {
  const passwordHash = await hashPassword(input.password);
  const otpPlain = generateOtpCode(6);
  const otpCodeHash = await hashOtpCode(otpPlain);
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

  const client = await pool.connect();
  let user;

  try {
    await client.query('BEGIN');

    const existingEmail = await userRepository.findByEmail(client, input.email);
    if (existingEmail) {
      throw new AppError('Email is already registered', 409);
    }

    const existingPhone = await userRepository.findByPhone(
      client,
      input.phoneNumber,
    );
    if (existingPhone) {
      throw new AppError('Phone number is already registered', 409);
    }

    user = await userRepository.createUser(client, {
      email: input.email.toLowerCase(),
      passwordHash,
      fullName: input.fullName,
      phoneNumber: input.phoneNumber,
      role: USER_ROLES.PLAYER,
      status: USER_STATUSES.ACTIVE,
      gender: input.gender,
    });

    await otpRepository.createOtpVerification(client, {
      userId: user.user_id,
      otpCodeHash,
      expiresAt,
      purpose: OTP_PURPOSES.REGISTER,
    });

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      throw new AppError('Email or phone number is already registered', 409);
    }
    throw err;
  } finally {
    client.release();
  }

  await deliverOtpEmail({
    email: user.email,
    otp: otpPlain,
    purpose: OTP_PURPOSES.REGISTER,
  });
  await setResendCooldown(user.email, OTP_PURPOSES.REGISTER);

  const publicUser = toPublicUser(user);
  return withDebugOtp(
    {
      message: 'Registration successful. Please verify the OTP sent to your email.',
      userId: publicUser.userId,
      email: publicUser.email,
    },
    otpPlain,
  );
}

export async function verifyOtp(input) {
  const email = input.email.toLowerCase();
  const purpose = input.purpose || OTP_PURPOSES.REGISTER;

  const client = await pool.connect();
  try {
    const user = await userRepository.findByEmail(client, email);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.email_verified_at) {
      return {
        message: 'Email already verified',
        email: user.email,
      };
    }

    const attempts = await getAttemptCount(email, purpose);
    if (attempts >= OTP_MAX_ATTEMPTS) {
      throw new AppError(
        'Too many invalid OTP attempts. Please request a new code.',
        429,
      );
    }

    const otpRow = await otpRepository.findLatestActiveOtp(client, {
      userId: user.user_id,
      purpose,
    });
    if (!otpRow) {
      throw new AppError('OTP expired or not found. Please request a new code.', 400);
    }

    const valid = await verifyOtpCode(otpRow.otp_code, input.otp);
    if (!valid) {
      const nextAttempts = await incrementAttemptCount(email, purpose);
      if (nextAttempts >= OTP_MAX_ATTEMPTS) {
        await otpRepository.invalidateUnusedOtps(client, {
          userId: user.user_id,
          purpose,
        });
        throw new AppError(
          'Too many invalid OTP attempts. Please request a new code.',
          429,
        );
      }
      throw new AppError('Invalid OTP', 400, {
        attemptsRemaining: OTP_MAX_ATTEMPTS - nextAttempts,
      });
    }

    await client.query('BEGIN');
    try {
      await otpRepository.markOtpUsed(client, otpRow.otp_id);
      await otpRepository.invalidateUnusedOtps(client, {
        userId: user.user_id,
        purpose,
      });
      await userRepository.markEmailVerified(client, user.user_id);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

    await clearOtpRedisState(user.user_id, email, purpose);

    return {
      message: 'Email verified successfully',
      email: user.email,
    };
  } finally {
    client.release();
  }
}

export async function resendOtp(input) {
  const email = input.email.toLowerCase();
  const purpose = input.purpose || OTP_PURPOSES.REGISTER;

  const client = await pool.connect();
  let user;

  try {
    user = await userRepository.findByEmail(client, email);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.email_verified_at) {
      throw new AppError('Email already verified', 400);
    }

    await assertResendAllowed(email, purpose);

    const otpPlain = generateOtpCode(6);
    const otpCodeHash = await hashOtpCode(otpPlain);
    const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

    await client.query('BEGIN');
    try {
      await otpRepository.invalidateUnusedOtps(client, {
        userId: user.user_id,
        purpose,
      });

      await otpRepository.createOtpVerification(client, {
        userId: user.user_id,
        otpCodeHash,
        expiresAt,
        purpose,
      });

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

    try {
      await ensureRedis();
      await redis.del(attemptsKey(email, purpose));
    } catch (err) {
      logger.warn('Failed to reset OTP attempt count', { error: err.message });
    }

    await deliverOtpEmail({
      email: user.email,
      otp: otpPlain,
      purpose,
    });
    await setResendCooldown(email, purpose);

    return withDebugOtp(
      {
        message: 'A new OTP has been sent to your email',
        email: user.email,
        resendAvailableInSeconds: OTP_RESEND_COOLDOWN_SECONDS,
      },
      otpPlain,
    );
  } finally {
    client.release();
  }
}
