export const NOTIFICATION_TYPES = Object.freeze({
  BOOKING_CREATED: 'BOOKING_CREATED',
  BOOKING_REMINDER: 'BOOKING_REMINDER',
  SYSTEM: 'SYSTEM',
});

export const REMINDER_STATUSES = Object.freeze({
  PENDING: 'PENDING',
  SENT: 'SENT',
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED',
});

export const REMINDER_OFFSET_HOURS = Object.freeze([24, 2]);

export const NOTIF_REMINDERS_REDIS_KEY = 'notif:reminders';

export const REMINDER_WORKER_INTERVAL_MS =
  Number(process.env.REMINDER_WORKER_INTERVAL_MS) || 15_000;
