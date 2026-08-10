import pool from '../../../shared/database/pool.js';
import redis from '../../../shared/database/redis.js';
import {
  USER_ROLES,
  USER_STATUSES,
  OTP_PURPOSES,
  OTP_TTL_SECONDS,
  OTP_EMAIL_REDIS_PREFIX,
} from '../../../shared/constants/auth.js';
import { hashPassword } from '../../../shared/utils/password.js';
import { generateOtpCode, hashOtpCode } from '../../../shared/utils/otp.js';
import logger from '../../../shared/utils/logger.js';
import { AppError } from '../../../shared/middleware/errorHandler.js';
import * as userRepository from '../repository/user.repository.js';
import * as otpRepository from '../repository/otp.repository.js';
import { toPublicUser } from '../entity/user.entity.js';

async function queueOtpEmail({ userId, email, otp, purpose }) {
  const key = `${OTP_EMAIL_REDIS_PREFIX}${userId}`;
  const payload = JSON.stringify({
    email,
    otp,
    purpose,
    userId,
    queuedAt: new Date().toISOString(),
  });

  try {
    if (redis.status === 'wait') {
      await redis.connect();
    }
    await redis.set(key, payload, 'EX', OTP_TTL_SECONDS);
  } catch (err) {
    logger.warn('Failed to queue OTP email in Redis', {
      userId,
      error: err.message,
    });
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

  await queueOtpEmail({
    userId: user.user_id,
    email: user.email,
    otp: otpPlain,
    purpose: OTP_PURPOSES.REGISTER,
  });

  const publicUser = toPublicUser(user);
  return {
    message: 'Registration successful. Please verify the OTP sent to your email.',
    userId: publicUser.userId,
    email: publicUser.email,
  };
}
