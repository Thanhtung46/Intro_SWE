import nodemailer from 'nodemailer';
import config from '../config/env.js';
import logger from './logger.js';
import { AppError } from '../middleware/errorHandler.js';

let transporter;
let verified = false;

function normalizePass(pass) {
  return String(pass || '').replace(/\s+/g, '');
}

export function isSmtpConfigured() {
  return Boolean(config.smtp.user && normalizePass(config.smtp.pass));
}

function assertSmtpIdentity() {
  const user = config.smtp.user;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user)) {
    throw new AppError(
      'SMTP_USER must be a full email address (e.g. you@gmail.com)',
      503,
    );
  }
}

function getTransporter() {
  if (!transporter) {
    assertSmtpIdentity();
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: normalizePass(config.smtp.pass),
      },
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 10_000,
    });
  }
  return transporter;
}

function otpAction(purpose) {
  if (purpose === 'FORGOT_PASSWORD') return 'reset your password';
  if (purpose === 'CHANGE_EMAIL') return 'confirm your email change';
  if (purpose === 'CHANGE_PHONE') return 'confirm your phone number change';
  return 'verify your email';
}

function otpSubject(purpose) {
  if (purpose === 'FORGOT_PASSWORD') {
    return 'SPOT password reset code';
  }
  if (purpose === 'CHANGE_EMAIL') {
    return 'SPOT confirm email change';
  }
  if (purpose === 'CHANGE_PHONE') {
    return 'SPOT confirm phone number change';
  }
  return 'SPOT email verification code';
}

function otpText({ otp, purpose, ttlSeconds }) {
  const minutes = Math.max(1, Math.round(ttlSeconds / 60));
  const action = otpAction(purpose);
  return [
    `Your SPOT verification code is: ${otp}`,
    '',
    `Use this code to ${action}. It expires in ${minutes} minutes.`,
    '',
    'If you did not request this, you can ignore this email.',
  ].join('\n');
}

function otpHtml({ otp, purpose, ttlSeconds }) {
  const minutes = Math.max(1, Math.round(ttlSeconds / 60));
  const action = otpAction(purpose);
  return `<!doctype html>
<html>
  <body style="font-family:Segoe UI,Arial,sans-serif;line-height:1.5;color:#111;">
    <p>Your SPOT verification code is:</p>
    <p style="font-size:28px;letter-spacing:6px;font-weight:700;">${otp}</p>
    <p>Use this code to ${action}. It expires in ${minutes} minutes.</p>
    <p style="color:#666;font-size:13px;">If you did not request this, you can ignore this email.</p>
  </body>
</html>`;
}

export async function verifySmtpConnection() {
  if (!isSmtpConfigured()) {
    return { ok: false, reason: 'not_configured' };
  }
  await getTransporter().verify();
  verified = true;
  return { ok: true };
}

/**
 * Sends OTP via Gmail SMTP (or any SMTP).
 * In development without SMTP credentials, logs the OTP instead of failing.
 */
export async function sendOtpEmail({ email, otp, purpose, ttlSeconds }) {
  const subject = otpSubject(purpose);
  const text = otpText({ otp, purpose, ttlSeconds });
  const html = otpHtml({ otp, purpose, ttlSeconds });

  if (!isSmtpConfigured()) {
    if (config.node_env === 'production') {
      throw new AppError('Email service is not configured', 503);
    }
    logger.info('SMTP not configured — OTP (dev only)', {
      email,
      purpose,
      otp,
    });
    return { delivered: false, mode: 'dev-log' };
  }

  try {
    const tx = getTransporter();
    if (!verified) {
      await tx.verify();
      verified = true;
    }

    const info = await tx.sendMail({
      from: config.smtp.from,
      to: email,
      subject,
      text,
      html,
    });

    logger.info('OTP email sent', {
      email,
      purpose,
      messageId: info.messageId,
    });

    if (config.otp.debug) {
      logger.info('OTP_DEBUG code', { email, purpose, otp });
    }

    return { delivered: true, mode: 'smtp', messageId: info.messageId };
  } catch (err) {
    verified = false;
    logger.error('Failed to send OTP email', {
      email,
      purpose,
      error: err.message,
    });
    throw new AppError('Failed to send OTP email. Please try again.', 503);
  }
}

/**
 * Sends a transactional notification email (booking / reminder / system).
 * In development without SMTP, logs instead of failing.
 */
export async function sendNotificationEmail({ email, subject, text, html }) {
  const safeSubject = subject || 'SPOT notification';
  const safeText = text || '';
  const safeHtml =
    html ||
    `<!doctype html><html><body style="font-family:Segoe UI,Arial,sans-serif;line-height:1.5;color:#111;">
      <p>${safeText.replace(/\n/g, '<br/>')}</p>
    </body></html>`;

  if (!isSmtpConfigured()) {
    if (config.node_env === 'production') {
      throw new AppError('Email service is not configured', 503);
    }
    logger.info('SMTP not configured — notification email (dev only)', {
      email,
      subject: safeSubject,
      text: safeText,
    });
    return { delivered: false, mode: 'dev-log' };
  }

  try {
    const tx = getTransporter();
    if (!verified) {
      await tx.verify();
      verified = true;
    }

    const info = await tx.sendMail({
      from: config.smtp.from,
      to: email,
      subject: safeSubject,
      text: safeText,
      html: safeHtml,
    });

    logger.info('Notification email sent', {
      email,
      subject: safeSubject,
      messageId: info.messageId,
    });

    return { delivered: true, mode: 'smtp', messageId: info.messageId };
  } catch (err) {
    verified = false;
    logger.error('Failed to send notification email', {
      email,
      subject: safeSubject,
      error: err.message,
    });
    throw new AppError('Failed to send notification email. Please try again.', 503);
  }
}
