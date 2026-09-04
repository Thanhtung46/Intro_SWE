import { Router } from 'express';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { requireActiveUser } from '../../shared/middleware/requireActiveUser.js';
import config from '../../shared/config/env.js';
import * as bookingController from './controller/booking.controller.js';

const router = Router();

router.post('/', authenticate, requireActiveUser, bookingController.create);
router.post(
  '/bulk',
  authenticate,
  requireActiveUser,
  bookingController.createBulk,
);

if (config.node_env !== 'production') {
  router.post(
    '/:id/dev/mark-paid',
    authenticate,
    requireActiveUser,
    bookingController.markPaidDev,
  );
}

export default router;
