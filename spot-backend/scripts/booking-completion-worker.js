/**
 * Polls bookings past their end time (PAID/CHECKED_IN) → COMPLETED.
 * Run alongside the API: npm run worker:booking-completion
 */
import { processExpiredBookings } from '../src/domains/booking/service/booking.service.js';
import { REMINDER_WORKER_INTERVAL_MS } from '../src/shared/constants/notification.js';

const INTERVAL_MS =
  Number(process.env.BOOKING_COMPLETION_WORKER_INTERVAL_MS) ||
  Math.max(REMINDER_WORKER_INTERVAL_MS, 60_000);

async function tick() {
  const { processed } = await processExpiredBookings({ limit: 50 });
  if (processed > 0) {
    console.log(`[booking-completion] completed=${processed}`);
  }
}

console.log(`[booking-completion] worker started (interval ${INTERVAL_MS}ms)`);
await tick();
setInterval(() => {
  tick().catch((err) => {
    console.error('[booking-completion] tick failed', err);
  });
}, INTERVAL_MS);
