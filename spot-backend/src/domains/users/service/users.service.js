import { createHash } from 'crypto';
import path from 'path';
import fs from 'fs';
import pool from '../../../shared/database/pool.js';
import redis from '../../../shared/database/redis.js';
import {
  OTP_PURPOSES,
  OTP_TTL_SECONDS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_ATTEMPTS_REDIS_PREFIX,
  OTP_RESEND_REDIS_PREFIX,
} from '../../../shared/constants/auth.js';
import {
  generateOtpCode,
  hashOtpCode,
  verifyOtpCode,
} from '../../../shared/utils/otp.js';
import { hashPassword, verifyPassword } from '../../../shared/utils/password.js';
import { sendOtpEmail } from '../../../shared/utils/mailer.js';
import logger from '../../../shared/utils/logger.js';
import { AppError } from '../../../shared/middleware/errorHandler.js';
import { AVATAR_UPLOAD_DIR } from '../../../shared/middleware/avatarUpload.js';
import * as userRepository from '../../auth/repository/user.repository.js';
import * as otpRepository from '../../auth/repository/otp.repository.js';
import * as userSportSkillRepository from '../../auth/repository/user-sport-skill.repository.js';
import { toPublicUser, toPublicPreferences } from '../../auth/entity/user.entity.js';
import config from '../../../shared/config/env.js';
import * as bookingService from '../../booking/service/booking.service.js';

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

/** Bind OTP row to a specific new email (no Redis pending required). */
function emailChangePurpose(newEmail) {
  const hash = createHash('sha256')
    .update(newEmail.toLowerCase())
    .digest('hex')
    .slice(0, 32);
  return `${OTP_PURPOSES.CHANGE_EMAIL}:${hash}`;
}

/** Bind OTP row to a specific new phone. */
function phoneChangePurpose(newPhone) {
  return `${OTP_PURPOSES.CHANGE_PHONE}:${newPhone}`;
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

async function clearOtpRedisState(email, purpose) {
  try {
    await ensureRedis();
    await redis.del(attemptsKey(email, purpose), resendKey(email, purpose));
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

export async function getMe(userId) {
  const client = await pool.connect();
  try {
    const user = await userRepository.findById(client, userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    const skillRows = await userSportSkillRepository.findByUserId(
      client,
      user.user_id,
    );
    return {
      user: toPublicUser(user, skillRows),
    };
  } finally {
    client.release();
  }
}

/** Main Profile: public user + aggregated booking/match stats. */
export async function getMainProfile(userId) {
  const { user } = await getMe(userId);
  const stats = await bookingService.getProfileStats(userId);

  return {
    user,
    stats: {
      ...stats,
      joinedAt: user.createdAt ?? null,
    },
  };
}

export async function patchMe(userId, input) {
  const client = await pool.connect();
  try {
    const existing = await userRepository.findById(client, userId);
    if (!existing) {
      throw new AppError('User not found', 404);
    }

    const updated = await userRepository.updateProfile(client, userId, {
      fullName: input.fullName,
      gender: input.gender,
      avatarUrl: input.avatarUrl,
      language: input.language,
      appearance: input.appearance,
      pushNotificationsEnabled: input.pushNotificationsEnabled,
      locationServicesEnabled: input.locationServicesEnabled,
    });

    const skillRows = await userSportSkillRepository.findByUserId(
      client,
      userId,
    );
    return {
      message: 'Profile updated successfully',
      user: toPublicUser(updated, skillRows),
    };
  } finally {
    client.release();
  }
}

/** Settings: read prefs (device sync = same row in DB). */
export async function getPreferences(userId) {
  const client = await pool.connect();
  try {
    const user = await userRepository.findById(client, userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return {
      preferences: toPublicPreferences(user),
    };
  } finally {
    client.release();
  }
}

/** Settings: PATCH language / appearance / push / location. */
export async function patchPreferences(userId, input) {
  const client = await pool.connect();
  try {
    const existing = await userRepository.findById(client, userId);
    if (!existing) {
      throw new AppError('User not found', 404);
    }

    const updated = await userRepository.updateProfile(client, userId, {
      language: input.language,
      appearance: input.appearance,
      pushNotificationsEnabled: input.pushNotificationsEnabled,
      locationServicesEnabled: input.locationServicesEnabled,
    });

    return {
      message: 'Preferences updated successfully',
      preferences: toPublicPreferences(updated),
    };
  } finally {
    client.release();
  }
}

export async function requestEmailChange(userId, input) {
  const newEmail = input.newEmail.toLowerCase();
  const purpose = emailChangePurpose(newEmail);
  const mailPurpose = OTP_PURPOSES.CHANGE_EMAIL;

  const client = await pool.connect();
  try {
    const user = await userRepository.findById(client, userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.email.toLowerCase() === newEmail) {
      throw new AppError('New email must be different from your current email', 400);
    }

    const taken = await userRepository.findByEmail(client, newEmail);
    if (taken && taken.user_id !== userId) {
      throw new AppError('Email is already registered', 409);
    }

    await assertResendAllowed(newEmail, purpose);

    const otpPlain = generateOtpCode(6);
    const otpCodeHash = await hashOtpCode(otpPlain);
    const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

    await client.query('BEGIN');
    try {
      await otpRepository.invalidateUnusedOtps(client, {
        userId,
        purpose,
      });
      await otpRepository.createOtpVerification(client, {
        userId,
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
      await redis.del(attemptsKey(newEmail, purpose));
    } catch (err) {
      logger.warn('Failed to reset OTP attempt count', { error: err.message });
    }

    await deliverOtpEmail({
      email: newEmail,
      otp: otpPlain,
      purpose: mailPurpose,
    });
    await setResendCooldown(newEmail, purpose);

    return withDebugOtp(
      {
        message: 'OTP sent to the new email address',
        newEmail,
        resendAvailableInSeconds: OTP_RESEND_COOLDOWN_SECONDS,
      },
      otpPlain,
    );
  } finally {
    client.release();
  }
}

export async function confirmEmailChange(userId, input) {
  const newEmail = input.newEmail.toLowerCase();
  const purpose = emailChangePurpose(newEmail);
  const invalidOtpMessage = 'Invalid or expired OTP';

  const client = await pool.connect();
  try {
    const user = await userRepository.findById(client, userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const attempts = await getAttemptCount(newEmail, purpose);
    if (attempts >= OTP_MAX_ATTEMPTS) {
      throw new AppError(
        'Too many invalid OTP attempts. Please request a new code.',
        429,
      );
    }

    const otpRow = await otpRepository.findLatestActiveOtp(client, {
      userId,
      purpose,
    });
    if (!otpRow) {
      throw new AppError(invalidOtpMessage, 400);
    }

    const valid = await verifyOtpCode(otpRow.otp_code, input.otp);
    if (!valid) {
      const nextAttempts = await incrementAttemptCount(newEmail, purpose);
      if (nextAttempts >= OTP_MAX_ATTEMPTS) {
        await otpRepository.invalidateUnusedOtps(client, {
          userId,
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

    const taken = await userRepository.findByEmail(client, newEmail);
    if (taken && taken.user_id !== userId) {
      throw new AppError('Email is already registered', 409);
    }

    let updated;
    await client.query('BEGIN');
    try {
      await otpRepository.markOtpUsed(client, otpRow.otp_id);
      await otpRepository.invalidateUnusedOtps(client, {
        userId,
        purpose,
      });
      updated = await userRepository.updateEmail(client, userId, newEmail);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        throw new AppError('Email is already registered', 409);
      }
      throw err;
    }

    await clearOtpRedisState(newEmail, purpose);

    return {
      message: 'Email updated successfully',
      user: toPublicUser(updated),
    };
  } finally {
    client.release();
  }
}

export async function requestPhoneChange(userId, input) {
  const newPhone = input.newPhone;
  const purpose = phoneChangePurpose(newPhone);
  const mailPurpose = OTP_PURPOSES.CHANGE_PHONE;

  const client = await pool.connect();
  try {
    const user = await userRepository.findById(client, userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.phone_number === newPhone) {
      throw new AppError(
        'New phone number must be different from your current phone number',
        400,
      );
    }

    const taken = await userRepository.findByPhone(client, newPhone);
    if (taken && taken.user_id !== userId) {
      throw new AppError('Phone number is already registered', 409);
    }

    const deliveryEmail = user.email.toLowerCase();
    await assertResendAllowed(deliveryEmail, purpose);

    const otpPlain = generateOtpCode(6);
    const otpCodeHash = await hashOtpCode(otpPlain);
    const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

    await client.query('BEGIN');
    try {
      await otpRepository.invalidateUnusedOtps(client, {
        userId,
        purpose,
      });
      await otpRepository.createOtpVerification(client, {
        userId,
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
      await redis.del(attemptsKey(deliveryEmail, purpose));
    } catch (err) {
      logger.warn('Failed to reset OTP attempt count', { error: err.message });
    }

    await deliverOtpEmail({
      email: deliveryEmail,
      otp: otpPlain,
      purpose: mailPurpose,
    });
    await setResendCooldown(deliveryEmail, purpose);

    return withDebugOtp(
      {
        message: 'OTP sent to your current email to confirm phone change',
        newPhone,
        resendAvailableInSeconds: OTP_RESEND_COOLDOWN_SECONDS,
      },
      otpPlain,
    );
  } finally {
    client.release();
  }
}

export async function confirmPhoneChange(userId, input) {
  const newPhone = input.newPhone;
  const purpose = phoneChangePurpose(newPhone);
  const invalidOtpMessage = 'Invalid or expired OTP';

  const client = await pool.connect();
  try {
    const user = await userRepository.findById(client, userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const deliveryEmail = user.email.toLowerCase();

    const attempts = await getAttemptCount(deliveryEmail, purpose);
    if (attempts >= OTP_MAX_ATTEMPTS) {
      throw new AppError(
        'Too many invalid OTP attempts. Please request a new code.',
        429,
      );
    }

    const otpRow = await otpRepository.findLatestActiveOtp(client, {
      userId,
      purpose,
    });
    if (!otpRow) {
      throw new AppError(invalidOtpMessage, 400);
    }

    const valid = await verifyOtpCode(otpRow.otp_code, input.otp);
    if (!valid) {
      const nextAttempts = await incrementAttemptCount(deliveryEmail, purpose);
      if (nextAttempts >= OTP_MAX_ATTEMPTS) {
        await otpRepository.invalidateUnusedOtps(client, {
          userId,
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

    const taken = await userRepository.findByPhone(client, newPhone);
    if (taken && taken.user_id !== userId) {
      throw new AppError('Phone number is already registered', 409);
    }

    let updated;
    await client.query('BEGIN');
    try {
      await otpRepository.markOtpUsed(client, otpRow.otp_id);
      await otpRepository.invalidateUnusedOtps(client, {
        userId,
        purpose,
      });
      updated = await userRepository.updatePhone(client, userId, newPhone);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        throw new AppError('Phone number is already registered', 409);
      }
      throw err;
    }

    await clearOtpRedisState(deliveryEmail, purpose);

    return {
      message: 'Phone number updated successfully',
      user: toPublicUser(updated),
    };
  } finally {
    client.release();
  }
}

export async function getMySchedule(userId, query) {
  return bookingService.listMySchedule(userId, query);
}

export async function seedMySchedule(userId, input) {
  return bookingService.seedScheduleForUser(userId, input);
}

export async function changePassword(userId, input) {
  const client = await pool.connect();
  try {
    const authRow = await userRepository.findPasswordHashById(client, userId);
    if (!authRow) {
      throw new AppError('User not found', 404);
    }

    const currentOk = await verifyPassword(
      authRow.password_hash,
      input.currentPassword,
    );
    if (!currentOk) {
      throw new AppError('Current password is incorrect', 400);
    }

    const passwordHash = await hashPassword(input.newPassword);
    await userRepository.updatePasswordHash(client, userId, passwordHash);
    await userRepository.resetLoginState(client, userId);

    return {
      message: 'Password updated successfully',
    };
  } finally {
    client.release();
  }
}

function isLocalAvatarUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.pathname.startsWith('/uploads/avatars/');
  } catch {
    return false;
  }
}

function localAvatarPathFromUrl(url) {
  const parsed = new URL(url);
  const name = path.basename(parsed.pathname);
  if (!name || name === '.' || name === '..') return null;
  return path.join(AVATAR_UPLOAD_DIR, name);
}

export async function uploadAvatar(userId, file) {
  if (!file) {
    throw new AppError('Avatar file is required (field name: avatar)', 400);
  }

  const avatarUrl = `${config.publicBaseUrl}/uploads/avatars/${file.filename}`;
  const client = await pool.connect();
  try {
    const existing = await userRepository.findById(client, userId);
    if (!existing) {
      try {
        fs.unlinkSync(path.join(AVATAR_UPLOAD_DIR, file.filename));
      } catch {
        /* ignore */
      }
      throw new AppError('User not found', 404);
    }

    const previousUrl = existing.avatar_url;
    const updated = await userRepository.updateProfile(client, userId, {
      avatarUrl,
    });

    if (isLocalAvatarUrl(previousUrl)) {
      const prevPath = localAvatarPathFromUrl(previousUrl);
      if (prevPath && prevPath !== path.join(AVATAR_UPLOAD_DIR, file.filename)) {
        try {
          fs.unlinkSync(prevPath);
        } catch {
          /* ignore missing old file */
        }
      }
    }

    return {
      message: 'Avatar updated successfully',
      user: toPublicUser(updated),
    };
  } finally {
    client.release();
  }
}
