export const USER_ROLES = Object.freeze({
  PLAYER: 'PLAYER',
  OWNER: 'OWNER',
  REFEREE: 'REFEREE',
  ADMIN: 'ADMIN',
});

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

export const OTP_EMAIL_REDIS_PREFIX = 'otp:email:';
