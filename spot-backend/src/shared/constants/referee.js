export const DEFAULT_REFEREE_FEE_VND = 150_000;

export const REFEREE_REGISTRATION_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
});

export const REFEREE_ASSIGNMENT_STATUSES = Object.freeze({
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
});

export const REFEREE_ASSIGNMENT_SOURCES = Object.freeze({
  HIRE_REFEREE: 'HIRE_REFEREE',
});

export const REFEREE_SIGNUP_DOCUMENT_KINDS = Object.freeze([
  'ID_FRONT',
  'ID_BACK',
  'VFF_LICENSE',
]);

export const REFEREE_INVITATION_TABS = Object.freeze({
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
});

export const REFEREE_COMPLETED_FILTERS = Object.freeze({
  ALL: 'all',
  COMPLETED: 'completed',
  DECLINED: 'declined',
});
