import { Router } from 'express';
import { authenticate } from '../../shared/middleware/authenticate.js';
import config from '../../shared/config/env.js';
import * as bookingController from './controller/booking.controller.js';

const router = Router();

router.post('/', authenticate, bookingController.create);
router.post('/bulk', authenticate, bookingController.createBulk);

if (config.node_env !== 'production') {
  router.post('/:id/dev/mark-paid', authenticate, bookingController.markPaidDev);
}

export default router;
