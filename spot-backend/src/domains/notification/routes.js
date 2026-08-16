import { Router } from 'express';
import * as notificationController from './controller/notification.controller.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import config from '../../shared/config/env.js';

const router = Router();

router.use(authenticate);

router.get('/', notificationController.list);
router.get('/unread-count', notificationController.unreadCount);
router.patch('/:id/read', notificationController.markRead);
router.post('/read-all', notificationController.markAllRead);

if (config.node_env !== 'production') {
  router.post('/dev/seed', notificationController.seed);
  router.post('/dev/process-due', notificationController.processDue);
}

export default router;
