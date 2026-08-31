import logger from '../../../shared/utils/logger.js';
import { sendNotificationEmail } from '../../../shared/utils/mailer.js';
import { NOTIFICATION_TYPES } from '../../../shared/constants/notification.js';
import { createNotification } from './notification.service.js';

export const ACCOUNT_SECURITY_ACTIONS = Object.freeze({
  EMAIL_CHANGED: 'ACCOUNT_EMAIL_CHANGED',
  PHONE_CHANGED: 'ACCOUNT_PHONE_CHANGED',
  PASSWORD_CHANGED: 'ACCOUNT_PASSWORD_CHANGED',
  PASSWORD_RESET: 'ACCOUNT_PASSWORD_RESET',
});

export function maskEmail(email) {
  if (!email || typeof email !== 'string') return '***';
  const normalized = email.toLowerCase().trim();
  const at = normalized.indexOf('@');
  if (at <= 0) return '***';
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const visible = local.length <= 1 ? '*' : `${local[0]}***`;
  return `${visible}@${domain}`;
}

export function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '***';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `***${digits.slice(-4)}`;
}

const SECURITY_EMAIL_SUBJECT = 'SPOT account security alert';
const SUPPORT_LINE =
  'If you did not make this change, contact support immediately.';

async function safeCreateNotification(payload) {
  try {
    await createNotification(payload);
  } catch (err) {
    logger.warn('Account security inbox notification failed', {
      error: err.message,
      userId: payload.userId,
      action: payload.data?.action,
    });
  }
}

async function safeSendEmail({ email, subject, text }) {
  if (!email) return;
  try {
    await sendNotificationEmail({ email, subject, text });
  } catch (err) {
    logger.warn('Account security email failed', {
      error: err.message,
    });
  }
}

export async function notifyEmailChanged({ userId, oldEmail, newEmail }) {
  const maskedNew = maskEmail(newEmail);
  const title = 'Email address updated';
  const body = `Your account email was updated to ${maskedNew}. ${SUPPORT_LINE}`;

  await safeCreateNotification({
    userId,
    type: NOTIFICATION_TYPES.SYSTEM,
    title,
    body,
    data: {
      action: ACCOUNT_SECURITY_ACTIONS.EMAIL_CHANGED,
      maskedEmail: maskedNew,
    },
    sendEmail: true,
  });

  const oldNormalized = oldEmail?.toLowerCase().trim();
  const newNormalized = newEmail?.toLowerCase().trim();
  if (oldNormalized && oldNormalized !== newNormalized) {
    await safeSendEmail({
      email: oldNormalized,
      subject: SECURITY_EMAIL_SUBJECT,
      text: `Your SPOT account email was changed to ${maskedNew}. ${SUPPORT_LINE}`,
    });
  }
}

export async function notifyPhoneChanged({ userId, newPhone }) {
  const maskedPhone = maskPhone(newPhone);
  const title = 'Phone number updated';
  const body = `Your phone number was updated to ${maskedPhone}. ${SUPPORT_LINE}`;

  await safeCreateNotification({
    userId,
    type: NOTIFICATION_TYPES.SYSTEM,
    title,
    body,
    data: {
      action: ACCOUNT_SECURITY_ACTIONS.PHONE_CHANGED,
      maskedPhone,
    },
    sendEmail: true,
  });
}

export async function notifyPasswordChanged({ userId }) {
  const title = 'Password updated';
  const body = `Your password was changed from Settings. ${SUPPORT_LINE}`;

  await safeCreateNotification({
    userId,
    type: NOTIFICATION_TYPES.SYSTEM,
    title,
    body,
    data: {
      action: ACCOUNT_SECURITY_ACTIONS.PASSWORD_CHANGED,
      source: 'settings',
    },
    sendEmail: true,
  });
}

export async function notifyPasswordReset({ userId }) {
  const title = 'Password reset';
  const body = `Your password was reset via forgot-password. ${SUPPORT_LINE}`;

  await safeCreateNotification({
    userId,
    type: NOTIFICATION_TYPES.SYSTEM,
    title,
    body,
    data: {
      action: ACCOUNT_SECURITY_ACTIONS.PASSWORD_RESET,
      source: 'forgot_password',
    },
    sendEmail: true,
  });
}
