export const USER_ROLES = Object.freeze({
  PLAYER: 'PLAYER',
  OWNER: 'OWNER',
  REFEREE: 'REFEREE',
  ADMIN: 'ADMIN',
});

/** Roles a user may choose during Register Step 2 (not ADMIN). */
export const SELECTABLE_ROLES = Object.freeze([
  USER_ROLES.PLAYER,
  USER_ROLES.OWNER,
  USER_ROLES.REFEREE,
]);

export const USER_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  PENDING: 'PENDING',
  LOCKED: 'LOCKED',
});

export const GENDERS = Object.freeze([
  'male',
  'female',
  'other',
  'prefer_not_to_say',
]);

export const OTP_PURPOSES = Object.freeze({
  REGISTER: 'REGISTER',
  FORGOT_PASSWORD: 'FORGOT_PASSWORD',
});

export const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS) || 300;

export const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS) || 5;

export const OTP_RESEND_COOLDOWN_SECONDS =
  Number(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60;

export const OTP_EMAIL_REDIS_PREFIX = 'otp:email:';

export const OTP_ATTEMPTS_REDIS_PREFIX = 'otp:attempts:';

export const OTP_RESEND_REDIS_PREFIX = 'otp:resend:';

export const LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS) || 5;

export const LOGIN_LOCKOUT_MINUTES =
  Number(process.env.LOGIN_LOCKOUT_MINUTES) || 15;
