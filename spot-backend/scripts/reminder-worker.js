/**
 * Polls due reminder_jobs and creates BOOKING_REMINDER inbox (+ email).
 * Run alongside the API: npm run worker:reminders
 */
import '../src/shared/config/env.js';
import {
  REMINDER_WORKER_INTERVAL_MS,
} from '../src/shared/constants/notification.js';
import { processDueReminders } from '../src/domains/notification/service/notification.service.js';
import { processDueRefereeRatingJobs } from '../src/domains/referee/service/referee-rating-schedule.service.js';
import logger from '../src/shared/utils/logger.js';
import pool from '../src/shared/database/pool.js';

let ticking = false;

async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    const result = await processDueReminders({ limit: 50 });
    const ratingResult = await processDueRefereeRatingJobs({ limit: 50 });
    if (result.processed > 0 || ratingResult.processed > 0) {
      logger.info('Reminder worker tick', { reminders: result, refereeRatings: ratingResult });
    }
  } catch (err) {
    logger.error('Reminder worker failed', { error: err.message });
  } finally {
    ticking = false;
  }
}

console.log(
  `Reminder worker started (interval ${REMINDER_WORKER_INTERVAL_MS}ms)`,
);
await tick();
const timer = setInterval(tick, REMINDER_WORKER_INTERVAL_MS);

async function shutdown() {
  clearInterval(timer);
  await pool.end();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
