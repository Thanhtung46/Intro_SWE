import { AppError } from '../../../../shared/middleware/errorHandler.js';

/** Phase 2: real MoMo sandbox integration. */
export function createMomoPayment() {
  throw new AppError('MoMo integration is not configured. Enable PAYMENT_DEBUG for stub mode.', 501);
}

export function verifyMomoWebhook() {
  throw new AppError('MoMo webhook is not configured', 501);
}
