import { AppError } from '../../../../shared/middleware/errorHandler.js';

/** Phase 2: real VNPay sandbox integration. */
export function createVnpayPayment() {
  throw new AppError('VNPay integration is not configured. Enable PAYMENT_DEBUG for stub mode.', 501);
}

export function verifyVnpayWebhook() {
  throw new AppError('VNPay webhook is not configured', 501);
}
