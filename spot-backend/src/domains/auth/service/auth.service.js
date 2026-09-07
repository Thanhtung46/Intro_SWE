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
  LOGIN_MAX_ATTEMPTS,
  LOGIN_LOCKOUT_MINUTES,
} from '../../../shared/constants/auth.js';
import { hashPassword, verifyPassword } from '../../../shared/utils/password.js';
import {
  generateOtpCode,
  hashOtpCode,
  verifyOtpCode,
} from '../../../shared/utils/otp.js';
import {
  signAccessToken,
  signRefreshToken,
  getAccessTokenTtlSeconds,
  verifyToken,
} from '../../../shared/utils/jwt.js';
import { sendOtpEmail } from '../../../shared/utils/mailer.js';
import logger from '../../../shared/utils/logger.js';
import { AppError } from '../../../shared/middleware/errorHandler.js';
import * as userRepository from '../repository/user.repository.js';
import * as otpRepository from '../repository/otp.repository.js';
import * as verificationRepository from '../../admin/repository/verification-request.repository.js';
import * as userSportSkillRepository from '../repository/user-sport-skill.repository.js';
import { toPublicUser, toPublicHostProfile } from '../entity/user.entity.js';
import { SPORTS } from '../../../shared/constants/sports.js';
import config from '../../../shared/config/env.js';
import * as matchRepository from '../../matchmaking/repository/match.repository.js';
import * as accountSecurityNotify from '../../notification/service/account-security-notify.js';
import { getHostRatingForUser } from '../../review/service/match-host-review.service.js';

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

async function publicUserWithSkills(client, user) {
  const skillRows = await userSportSkillRepository.findByUserId(
    client,
    user.user_id,
  );
  return toPublicUser(user, skillRows);
}

async function applySkillPatch(client, userId, sport, value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    await userSportSkillRepository.deleteSkill(client, { userId, sport });
    return;
  }
  await userSportSkillRepository.upsertSkill(client, {
    userId,
    sport,
    skillLevel: value,
  });
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
      throw new AppError('Email is already registered', 409, { field: 'email' });
    }

    const existingPhone = await userRepository.findByPhone(
      client,
      input.phoneNumber,
    );
    if (existingPhone) {
      throw new AppError('Phone number is already registered', 409, { field: 'phoneNumber' });
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
      message: 'Registration successful. Please select your role, then verify OTP.',
      userId: publicUser.userId,
      email: publicUser.email,
      nextStep: 'SELECT_ROLE',
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

    const verifiedUser = await userRepository.findById(client, user.user_id);
    const response = {
      message: 'Email verified successfully',
      email: user.email,
    };

    if (
      verifiedUser?.status === USER_STATUSES.PENDING &&
      (verifiedUser.role === USER_ROLES.OWNER ||
        verifiedUser.role === USER_ROLES.REFEREE)
    ) {
      response.accessToken = signAccessToken(verifiedUser);
      response.refreshToken = signRefreshToken(verifiedUser);
      response.tokenType = 'Bearer';
      response.expiresIn = getAccessTokenTtlSeconds();
      response.nextStep = 'SUBMIT_VERIFICATION';
    }

    return response;
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

/**
 * Verify a login password. Returns on success; on a wrong password it records
 * the failed attempt and throws (lockout after LOGIN_MAX_ATTEMPTS, otherwise
 * 401 with attemptsRemaining) — extracted verbatim from login() so the PENDING
 * branch can run after the password is checked.
 */
async function verifyLoginPassword(client, user, password) {
  const passwordOk = await verifyPassword(user.password_hash, password);
  if (passwordOk) {
    return;
  }

  const nextAttempts = Number(user.login_attempts || 0) + 1;
  let lockoutUntil = null;
  if (nextAttempts >= LOGIN_MAX_ATTEMPTS) {
    lockoutUntil = new Date(Date.now() + LOGIN_LOCKOUT_MINUTES * 60 * 1000);
  }

  await userRepository.recordFailedLogin(client, user.user_id, {
    attempts: nextAttempts >= LOGIN_MAX_ATTEMPTS ? 0 : nextAttempts,
    lockoutUntil,
  });

  if (lockoutUntil) {
    throw new AppError(
      `Too many failed attempts. Account locked for ${LOGIN_LOCKOUT_MINUTES} minutes.`,
      403,
      { lockoutUntil },
    );
  }

  throw new AppError('Invalid email or password', 401, {
    attemptsRemaining: LOGIN_MAX_ATTEMPTS - nextAttempts,
  });
}

export async function login(input) {
  const email = input.email.toLowerCase();
  const client = await pool.connect();

  try {
    const user = await userRepository.findAuthByEmail(client, email);
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    if (user.status === USER_STATUSES.LOCKED) {
      throw new AppError('Account is locked. Please contact support.', 403);
    }

    if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
      throw new AppError('Account temporarily locked. Try again later.', 403, {
        lockoutUntil: user.lockout_until,
      });
    }

    if (!user.email_verified_at) {
      throw new AppError('Email is not verified. Please verify OTP first.', 403);
    }

    if (!user.role_selected_at) {
      throw new AppError('Please select your role to continue.', 403, {
        nextStep: 'SELECT_ROLE',
      });
    }

    // Password is checked before the PENDING branch: a correct password is
    // required to learn whether an account is pending (closes an
    // account-enumeration hole) and to receive a resume token.
    await verifyLoginPassword(client, user, input.password);

    // Correct password → clear the failed-attempt counter regardless of the
    // outcome below (PENDING resume token / PENDING 403 / ACTIVE login).
    await userRepository.resetLoginState(client, user.user_id);

    if (user.status === USER_STATUSES.PENDING) {
      if (user.role === USER_ROLES.REFEREE) {
        const pending = await verificationRepository.listPendingByUserId(
          client,
          user.user_id,
        );
        if (pending.length === 0) {
          // Referee never submitted (or every document was rejected) → issue a
          // session token so onboarding can resume from any device.
          return {
            message:
              'Verification pending — submit your documents to continue.',
            accessToken: signAccessToken(user),
            refreshToken: signRefreshToken(user),
            tokenType: 'Bearer',
            expiresIn: getAccessTokenTtlSeconds(),
            nextStep: 'SUBMIT_VERIFICATION',
            user: await publicUserWithSkills(client, user),
          };
        }
      }

      // OWNER pending (any state), or a referee whose documents are awaiting
      // admin review → still 403 (message mapped to a neutral copy by H1).
      throw new AppError(
        'Account is pending approval and cannot log in yet.',
        403,
        { nextStep: 'SUBMIT_VERIFICATION' },
      );
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    return {
      message: 'Login successful',
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: getAccessTokenTtlSeconds(),
      user: await publicUserWithSkills(client, user),
    };
  } finally {
    client.release();
  }
}

function assertUserCanHoldSession(user) {
  if (!user) {
    throw new AppError('Invalid or expired refresh token', 401);
  }
  if (user.status === USER_STATUSES.LOCKED) {
    throw new AppError('Account is locked. Please contact support.', 403);
  }
  if (user.status === USER_STATUSES.PENDING) {
    throw new AppError(
      'Account is pending approval and cannot log in yet.',
      403,
    );
  }
}

export async function refreshSession(input) {
  let payload;
  try {
    payload = verifyToken(input.refreshToken);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  if (payload.type !== 'refresh' || !payload.sub) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const client = await pool.connect();
  try {
    const user = await userRepository.findById(client, payload.sub);
    assertUserCanHoldSession(user);

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    return {
      message: 'Token refreshed',
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: getAccessTokenTtlSeconds(),
      user: await publicUserWithSkills(client, user),
    };
  } finally {
    client.release();
  }
}

/** Alias of users.getMe — kept for any internal callers. */
export async function getCurrentUser(userId) {
  const client = await pool.connect();
  try {
    const user = await userRepository.findById(client, userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return {
      user: await publicUserWithSkills(client, user),
    };
  } finally {
    client.release();
  }
}

export async function getPublicUserProfile(userId) {
  const client = await pool.connect();
  try {
    const user = await userRepository.findById(client, userId);
    if (!user || user.status !== USER_STATUSES.ACTIVE) {
      throw new AppError('User not found', 404);
    }
    const skillRows = await userSportSkillRepository.findByUserId(
      client,
      user.user_id,
    );
    const matchCount = await matchRepository.countHostedByUser(
      client,
      user.user_id,
    );
    const joinedMatches = await matchRepository.countJoinedByUser(
      client,
      user.user_id,
    );
    const hostRating = await getHostRatingForUser(client, user.user_id);
    return {
      user: toPublicHostProfile(user, skillRows, {
        matchCount,
        joinedMatches,
        hostRating,
      }),
    };
  } finally {
    client.release();
  }
}

export async function updateCurrentUser(userId, { skills, avatarUrl }) {
  const client = await pool.connect();
  try {
    const user = await userRepository.findById(client, userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    await client.query('BEGIN');
    try {
      if (skills) {
        await applySkillPatch(client, userId, SPORTS.BADMINTON, skills.badminton);
        await applySkillPatch(client, userId, SPORTS.FOOTBALL, skills.football);
      }
      if (avatarUrl !== undefined) {
        const updatedProfile = await userRepository.updateAvatarUrl(
          client,
          userId,
          avatarUrl,
        );
        if (!updatedProfile) {
          throw new AppError('User profile not found', 404);
        }
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

    const fresh = await userRepository.findById(client, userId);
    return {
      message: 'Profile updated',
      user: await publicUserWithSkills(client, fresh),
    };
  } finally {
    client.release();
  }
}

export async function selectRole(input) {
  const email = input.email.toLowerCase();
  const role = input.role;
  const client = await pool.connect();

  try {
    const user = await userRepository.findByEmail(client, email);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.role_selected_at) {
      throw new AppError('Role has already been selected', 409, {
        role: user.role,
        status: user.status,
      });
    }

    const status =
      role === USER_ROLES.PLAYER
        ? USER_STATUSES.ACTIVE
        : USER_STATUSES.PENDING;

    const updated = await userRepository.selectRole(client, user.user_id, {
      role,
      status,
    });

    const response = {
      message:
        status === USER_STATUSES.PENDING
          ? 'Role selected. Account is pending approval.'
          : 'Role selected successfully',
      nextStep: user.email_verified_at ? 'LOGIN' : 'VERIFY_OTP',
      user: await publicUserWithSkills(client, updated),
    };

    // Register → OTP → Role: email is already verified by now, so issue the
    // pending Owner/Referee session token + SUBMIT_VERIFICATION here (same as
    // POST /auth/otp/verify does when the role is chosen first). Without this
    // a pending Owner/Referee has no token to submit verification documents.
    if (
      user.email_verified_at &&
      status === USER_STATUSES.PENDING &&
      (role === USER_ROLES.OWNER || role === USER_ROLES.REFEREE)
    ) {
      const refreshed = await userRepository.findById(client, updated.user_id);
      response.accessToken = signAccessToken(refreshed);
      response.refreshToken = signRefreshToken(refreshed);
      response.tokenType = 'Bearer';
      response.expiresIn = getAccessTokenTtlSeconds();
      response.nextStep = 'SUBMIT_VERIFICATION';
    }

    return response;
  } finally {
    client.release();
  }
}

const FORGOT_PASSWORD_GENERIC_MESSAGE =
  'If an account exists for this email, an OTP has been sent.';

export async function forgotPassword(input) {
  const email = input.email.toLowerCase();
  const purpose = OTP_PURPOSES.FORGOT_PASSWORD;
  const generic = { message: FORGOT_PASSWORD_GENERIC_MESSAGE };

  const client = await pool.connect();
  try {
    const user = await userRepository.findByEmail(client, email);
    if (!user) {
      return generic;
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

    return withDebugOtp(generic, otpPlain);
  } finally {
    client.release();
  }
}

export async function resetPassword(input) {
  const email = input.email.toLowerCase();
  const purpose = OTP_PURPOSES.FORGOT_PASSWORD;
  const invalidOtpMessage = 'Invalid or expired OTP';

  const client = await pool.connect();
  try {
    const user = await userRepository.findByEmail(client, email);
    if (!user) {
      throw new AppError(invalidOtpMessage, 400);
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
      throw new AppError(invalidOtpMessage, 400);
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
      throw new AppError(invalidOtpMessage, 400, {
        attemptsRemaining: OTP_MAX_ATTEMPTS - nextAttempts,
      });
    }

    const passwordHash = await hashPassword(input.newPassword);

    await client.query('BEGIN');
    try {
      await otpRepository.markOtpUsed(client, otpRow.otp_id);
      await otpRepository.invalidateUnusedOtps(client, {
        userId: user.user_id,
        purpose,
      });
      await userRepository.updatePasswordHash(
        client,
        user.user_id,
        passwordHash,
      );
      await userRepository.resetLoginState(client, user.user_id);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

    await clearOtpRedisState(user.user_id, email, purpose);

    void accountSecurityNotify.notifyPasswordReset({ userId: user.user_id });

    return {
      message: 'Password has been reset successfully. You can now log in.',
      email: user.email,
    };
  } finally {
    client.release();
  }
}
