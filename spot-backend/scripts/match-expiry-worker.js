/**
 * Polls expired pickup kèo → full: COMPLETED; underfilled: CANCELLED + inbox.
 * Run alongside the API: npm run worker:match-expiry
 */
import {
  processExpiredFullMatches,
  processExpiredUnderfilledMatches,
} from '../src/domains/matchmaking/service/match.service.js';
import { REMINDER_WORKER_INTERVAL_MS } from '../src/shared/constants/notification.js';

const INTERVAL_MS =
  Number(process.env.MATCH_EXPIRY_WORKER_INTERVAL_MS) ||
  Math.max(REMINDER_WORKER_INTERVAL_MS, 60_000);

async function tick() {
  const full = await processExpiredFullMatches({ limit: 50 });
  const underfilled = await processExpiredUnderfilledMatches({ limit: 50 });
  if (full.processed > 0 || underfilled.processed > 0) {
    console.log(
      `[match-expiry] full=${full.processed} underfilled=${underfilled.processed}`,
    );
  }
}

console.log(`[match-expiry] worker started (interval ${INTERVAL_MS}ms)`);
await tick();
setInterval(() => {
  tick().catch((err) => {
    console.error('[match-expiry] tick failed', err);
  });
}, INTERVAL_MS);
