import { parseListNotificationsDto } from '../dto/list.dto.js';
import { parseNotificationIdParam } from '../dto/mark-read.dto.js';
import { parseSeedNotificationDto } from '../dto/seed.dto.js';
import * as notificationService from '../service/notification.service.js';

export async function list(req, res, next) {
  try {
    const query = parseListNotificationsDto(req.query);
    const result = await notificationService.listNotifications(
      req.user.userId,
      query,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function unreadCount(req, res, next) {
  try {
    const result = await notificationService.getUnreadCount(req.user.userId);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function markRead(req, res, next) {
  try {
    const { id } = parseNotificationIdParam(req.params);
    const result = await notificationService.markNotificationRead(
      req.user.userId,
      id,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function markAllRead(req, res, next) {
  try {
    const result = await notificationService.markAllNotificationsRead(
      req.user.userId,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function seed(req, res, next) {
  try {
    const dto = parseSeedNotificationDto(req.body);
    const result = await notificationService.seedForUser(req.user.userId, dto);
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function processDue(req, res, next) {
  try {
    const result = await notificationService.processDueReminders();
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}
