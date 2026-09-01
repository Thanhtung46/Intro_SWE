export const VERIFICATION_REQUEST_TYPES = Object.freeze({
  OWNER_LICENSE: 'OWNER_LICENSE',
  REFEREE_CREDENTIAL: 'REFEREE_CREDENTIAL',
});

export const VERIFICATION_STATUSES = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
});

export const ADMIN_AUDIT_ACTIONS = Object.freeze({
  APPROVAL_APPROVE: 'APPROVAL_APPROVE',
  APPROVAL_REJECT: 'APPROVAL_REJECT',
  USER_UPDATE: 'USER_UPDATE',
  SETTINGS_UPDATE: 'SETTINGS_UPDATE',
});

export const ADMIN_AUDIT_TARGET_TYPES = Object.freeze({
  VERIFICATION_REQUEST: 'verification_request',
  USER: 'user',
  SYSTEM_SETTING: 'system_setting',
});

export const SYSTEM_SETTING_KEYS = Object.freeze({
  COMMISSION_RATE_PERCENT: 'commissionRatePercent',
  PAYMENT_GATEWAYS: 'paymentGateways',
  OTP_EXPIRY_SECONDS: 'otpExpirySeconds',
  DEFAULT_CANCELLATION_WINDOW_HOURS: 'defaultCancellationWindowHours',
});

export const ADMIN_SETTINGS_REDIS_KEY = 'admin:settings:all';
export const ADMIN_SETTINGS_CACHE_TTL_SECONDS = 60;
