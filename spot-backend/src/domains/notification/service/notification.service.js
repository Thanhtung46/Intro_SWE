import pool from '../../../shared/database/pool.js';
import redis from '../../../shared/database/redis.js';
import config from '../../../shared/config/env.js';
import logger from '../../../shared/utils/logger.js';
import { sendNotificationEmail } from '../../../shared/utils/mailer.js';
import { AppError } from '../../../shared/middleware/errorHandler.js';
import {
  NOTIFICATION_TYPES,
  REMINDER_OFFSET_HOURS,
  NOTIF_REMINDERS_REDIS_KEY,
} from '../../../shared/constants/notification.js';
import * as userRepository from '../../auth/repository/user.repository.js';
import * as notificationRepository from '../repository/notification.repository.js';
import * as reminderRepository from '../repository/reminder.repository.js';
import { toPublicNotification } from '../entity/notification.entity.js';

async function ensureRedis() {
  if (redis.status === 'ready') return;
  if (redis.status === 'connecting' || redis.status === 'connect') return;
  if (
    redis.status === 'wait' ||
    redis.status === 'end' ||
    redis.status === 'close'
  ) {
    await redis.connect();
  }
}

async function zaddReminder(reminderId, fireAt) {
  try {
    await ensureRedis();
    const score = Math.floor(new Date(fireAt).getTime() / 1000);
    await redis.zadd(NOTIF_REMINDERS_REDIS_KEY, score, String(reminderId));
  } catch (err) {
    logger.warn('Failed to ZADD reminder to Redis', { error: err.message });
  }
}

async function zremReminders(reminderIds) {
  if (!reminderIds?.length) return;
  try {
    await ensureRedis();
    await redis.zrem(NOTIF_REMINDERS_REDIS_KEY, ...reminderIds.map(String));
  } catch (err) {
    logger.warn('Failed to ZREM reminders from Redis', { error: err.message });
  }
}

async function shouldSendReminderEmail(user) {
  return user.push_notifications_enabled !== false;
}

function emailPayloadForType(type, { title, body }) {
  if (type === NOTIFICATION_TYPES.BOOKING_CREATED) {
    return {
      subject: title || 'SPOT booking confirmation',
      text: body,
    };
  }
  if (type === NOTIFICATION_TYPES.BOOKING_REMINDER) {
    return {
      subject: title || 'SPOT booking reminder',
      text: body,
    };
  }
  return {
    subject: title || 'SPOT notification',
    text: body,
  };
}

/**
 * Creates an in-app notification and optionally emails the user.
 * Opt-out (`push_notifications_enabled=false`): skip email for BOOKING_REMINDER only.
 */
export async function createNotification({
  userId,
  type,
  title,
  body,
  data = {},
  sendEmail = true,
}) {
  const client = await pool.connect();
  try {
    const user = await userRepository.findById(client, userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const row = await notificationRepository.createNotification(client, {
      userId,
      type,
      title,
      body,
      data,
    });

    const isReminder = type === NOTIFICATION_TYPES.BOOKING_REMINDER;
    const allowEmail =
      sendEmail &&
      (type === NOTIFICATION_TYPES.BOOKING_CREATED ||
        type === NOTIFICATION_TYPES.BOOKING_REMINDER ||
        type === NOTIFICATION_TYPES.MATCH_EXPIRED_UNDERFILLED ||
        type === NOTIFICATION_TYPES.MATCH_CANCELLED ||
        type === NOTIFICATION_TYPES.SYSTEM) &&
      (!isReminder || (await shouldSendReminderEmail(user)));

    if (allowEmail && user.email) {
      try {
        const mail = emailPayloadForType(type, { title, body });
        await sendNotificationEmail({
          email: user.email,
          subject: mail.subject,
          text: mail.text,
        });
      } catch (err) {
        logger.warn('Notification email failed (inbox row kept)', {
          error: err.message,
          userId,
          type,
        });
      }
    }

    return toPublicNotification(row);
  } finally {
    client.release();
  }
}

export async function listNotifications(userId, query) {
  const client = await pool.connect();
  try {
    const rows = await notificationRepository.listByUser(client, userId, {
      limit: query.limit,
      beforeId: query.beforeId ?? null,
      unreadOnly: query.unreadOnly,
    });
    return {
      items: rows.map(toPublicNotification),
      nextCursor:
        rows.length === query.limit
          ? rows[rows.length - 1].notification_id
          : null,
    };
  } finally {
    client.release();
  }
}

export async function getUnreadCount(userId) {
  const client = await pool.connect();
  try {
    const count = await notificationRepository.countUnread(client, userId);
    return { count };
  } finally {
    client.release();
  }
}

export async function markNotificationRead(userId, notificationId) {
  const client = await pool.connect();
  try {
    const row = await notificationRepository.markRead(
      client,
      notificationId,
      userId,
    );
    if (!row) {
      throw new AppError('Notification not found', 404);
    }
    return { notification: toPublicNotification(row) };
  } finally {
    client.release();
  }
}

export async function markAllNotificationsRead(userId) {
  const client = await pool.connect();
  try {
    const updated = await notificationRepository.markAllRead(client, userId);
    return { updated };
  } finally {
    client.release();
  }
}

/**
 * Schedule T-24h and T-2h reminder jobs for a booking start time.
 * Skips offsets already in the past.
 */
export async function scheduleBookingReminders({
  userId,
  bookingId = null,
  startAt,
}) {
  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) {
    throw new AppError('Invalid startAt', 400);
  }

  const client = await pool.connect();
  const created = [];
  try {
    const user = await userRepository.findById(client, userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const now = Date.now();
    for (const offsetHours of REMINDER_OFFSET_HOURS) {
      const fireAt = new Date(start.getTime() - offsetHours * 60 * 60 * 1000);
      if (fireAt.getTime() <= now) {
        continue;
      }

      try {
        const job = await reminderRepository.createReminderJob(client, {
          userId,
          bookingId,
          offsetHours,
          fireAt,
        });
        await zaddReminder(job.reminder_id, fireAt);
        created.push({
          reminderId: job.reminder_id,
          offsetHours,
          fireAt: job.fire_at,
        });
      } catch (err) {
        if (err.code === '23505') {
          logger.info('Reminder job already pending', {
            bookingId,
            userId,
            offsetHours,
          });
          continue;
        }
        throw err;
      }
    }

    return { scheduled: created };
  } finally {
    client.release();
  }
}

export async function cancelRemindersForBooking(bookingId) {
  const client = await pool.connect();
  try {
    const ids = await reminderRepository.findPendingIdsForBooking(
      client,
      bookingId,
    );
    const cancelled = await reminderRepository.cancelForBooking(
      client,
      bookingId,
    );
    await zremReminders(ids);
    return { cancelled };
  } finally {
    client.release();
  }
}

async function processOneReminder(job) {
  const client = await pool.connect();
  let locked;
  try {
    locked = await reminderRepository.findById(client, job.reminder_id);
  } finally {
    client.release();
  }

  if (!locked || locked.status !== 'PENDING') {
    return { skipped: true };
  }

  const hours = locked.offset_hours;
  const title =
    hours === 24
      ? 'Booking reminder — 24 hours'
      : 'Booking reminder — 2 hours';
  const body =
    hours === 24
      ? 'Your booking starts in 24 hours. Please arrive on time.'
      : 'Your booking starts in 2 hours. Please head to the venue soon.';

  try {
    const notification = await createNotification({
      userId: locked.user_id,
      type: NOTIFICATION_TYPES.BOOKING_REMINDER,
      title,
      body,
      data: {
        bookingId: locked.booking_id,
        offsetHours: hours,
        reminderId: locked.reminder_id,
      },
    });

    const markClient = await pool.connect();
    try {
      const updated = await reminderRepository.markSent(
        markClient,
        locked.reminder_id,
        notification.notificationId,
      );
      if (!updated) {
        return { skipped: true };
      }
    } finally {
      markClient.release();
    }

    await zremReminders([locked.reminder_id]);
    return { sent: true, notification };
  } catch (err) {
    logger.error('Failed to process reminder', {
      reminderId: job.reminder_id,
      error: err.message,
    });
    const failClient = await pool.connect();
    try {
      await reminderRepository.markFailed(failClient, job.reminder_id);
    } catch (markErr) {
      logger.warn('Failed to mark reminder FAILED', {
        error: markErr.message,
      });
    } finally {
      failClient.release();
    }
    return { failed: true };
  }
}

/**
 * Process due PENDING reminders (DB poll; Redis is an optional accelerator).
 */
export async function processDueReminders({ limit = 50 } = {}) {
  const client = await pool.connect();
  let due;
  try {
    due = await reminderRepository.findDuePending(client, { limit });
  } finally {
    client.release();
  }

  const results = [];
  for (const job of due) {
    results.push(await processOneReminder(job));
  }
  return {
    processed: results.length,
    sent: results.filter((r) => r.sent).length,
    failed: results.filter((r) => r.failed).length,
    skipped: results.filter((r) => r.skipped).length,
  };
}

/** Dev/smoke: seed inbox (+ optional schedule / due reminder). */
export async function seedForUser(userId, input) {
  if (config.node_env === 'production') {
    throw new AppError('Dev seed is disabled in production', 403);
  }

  const notification = await createNotification({
    userId,
    type: input.type,
    title: input.title,
    body: input.body,
    data: {
      ...input.data,
      ...(input.bookingId ? { bookingId: input.bookingId } : {}),
    },
    sendEmail: input.type !== NOTIFICATION_TYPES.SYSTEM,
  });

  let scheduled = null;
  if (input.scheduleReminders) {
    if (!input.startAt) {
      throw new AppError('startAt is required when scheduleReminders is true', 400);
    }
    scheduled = await scheduleBookingReminders({
      userId,
      bookingId: input.bookingId ?? null,
      startAt: input.startAt,
    });
  }

  let dueReminder = null;
  if (input.dueReminderNow) {
    const client = await pool.connect();
    try {
      const fireAt = new Date(Date.now() - 5 * 60_000);
      const job = await reminderRepository.createReminderJob(client, {
        userId,
        bookingId: input.bookingId ?? null,
        offsetHours: 2,
        fireAt,
      });
      await zaddReminder(job.reminder_id, fireAt);
      dueReminder = {
        reminderId: job.reminder_id,
        fireAt: job.fire_at,
      };
    } finally {
      client.release();
    }
  }

  return { notification, scheduled, dueReminder };
}
