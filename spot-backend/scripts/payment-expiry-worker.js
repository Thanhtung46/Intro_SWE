/**
 * Expires pending payment transactions and cancels unpaid bookings.
 * Run periodically in production: npm run worker:payment-expiry
 */
import '../src/shared/config/env.js';
import { processExpiredPayments } from '../src/domains/payment/service/payment.service.js';
import logger from '../src/shared/utils/logger.js';

const intervalMs = Number(process.env.PAYMENT_EXPIRY_INTERVAL_MS) || 60_000;

async function tick() {
  try {
    const result = await processExpiredPayments();
    if (result.processed > 0) {
      logger.info('Payment expiry worker processed items', result);
    }
  } catch (err) {
    logger.error('Payment expiry worker tick failed', { error: err.message });
  }
}

await tick();
console.log(`Payment expiry worker running every ${intervalMs}ms`);
setInterval(tick, intervalMs);
