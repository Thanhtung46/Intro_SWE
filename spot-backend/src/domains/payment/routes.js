import { Router } from 'express';
import { authenticate } from '../../shared/middleware/authenticate.js';
import config from '../../shared/config/env.js';
import * as paymentController from './controller/payment.controller.js';

const router = Router();

router.get(
  '/bookings/:bookingId/summary',
  authenticate,
  paymentController.getSummary,
);
router.post('/create', authenticate, paymentController.create);
router.get(
  '/transactions/:transactionId',
  authenticate,
  paymentController.getTransaction,
);

router.post('/webhooks/vnpay', paymentController.webhookVnpay);
router.post('/webhooks/momo', paymentController.webhookMomo);

if (config.payment.debug) {
  router.post('/dev/confirm', authenticate, paymentController.devConfirm);
  router.get('/stub/redirect', paymentController.stubRedirect);
}

export default router;
