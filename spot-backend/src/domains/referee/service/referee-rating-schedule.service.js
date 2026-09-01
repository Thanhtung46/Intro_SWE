import pool from '../../../shared/database/pool.js';
import logger from '../../../shared/utils/logger.js';
import { REFEREE_ASSIGNMENT_STATUSES } from '../../../shared/constants/referee.js';
import * as assignmentRatingContextRepository from '../repository/assignment-rating-context.repository.js';
import * as refereeRatingJobRepository from '../../notification/repository/referee-rating-job.repository.js';
import { notifyPlayerRateReferee } from './referee-notify.js';

function isEligibleAssignmentStatus(status) {
  return (
    status === REFEREE_ASSIGNMENT_STATUSES.ACCEPTED
    || status === REFEREE_ASSIGNMENT_STATUSES.COMPLETED
  );
}

async function hasExistingRefereeReview(client, assignmentId) {
  const { rows } = await client.query(
    `SELECT 1
     FROM schema_review.referee_reviews
     WHERE assignment_id = $1
     LIMIT 1`,
    [assignmentId],
  );
  return rows.length > 0;
}

async function loadEligibleContext(client, assignmentId) {
  const ctx = await assignmentRatingContextRepository.findRatingPromptContextByAssignmentId(
    client,
    assignmentId,
  );
  if (!ctx) return null;
  if (!ctx.hire_referee) return null;
  if (!isEligibleAssignmentStatus(ctx.assignment_status)) return null;

  const endsAt = new Date(ctx.ends_at);
  if (Number.isNaN(endsAt.getTime()) || endsAt.getTime() > Date.now()) {
    return null;
  }

  if (await hasExistingRefereeReview(client, assignmentId)) {
    return null;
  }

  return ctx;
}

/**
 * Schedule (or send immediately) a player inbox prompt to rate the referee
 * after match ends. Called when referee accepts an assignment.
 */
export async function scheduleRefereeRatingPrompt(assignmentId) {
  const client = await pool.connect();
  try {
    const ctx = await assignmentRatingContextRepository.findRatingPromptContextByAssignmentId(
      client,
      assignmentId,
    );
    if (!ctx?.hire_referee) return { scheduled: false, reason: 'not_hire_referee' };
    if (!isEligibleAssignmentStatus(ctx.assignment_status)) {
      return { scheduled: false, reason: 'invalid_assignment_status' };
    }

    const endsAt = new Date(ctx.ends_at);
    if (Number.isNaN(endsAt.getTime())) {
      return { scheduled: false, reason: 'invalid_ends_at' };
    }

    if (await hasExistingRefereeReview(client, assignmentId)) {
      return { scheduled: false, reason: 'already_rated' };
    }

    if (endsAt.getTime() <= Date.now()) {
      await notifyPlayerRateReferee({
        playerId: ctx.player_id,
        assignmentId: ctx.assignment_id,
        bookingId: ctx.booking_id,
        refereeId: ctx.referee_id,
        venueName: ctx.venue_name,
        refereeName: ctx.referee_name,
      });
      return { scheduled: false, sent: true };
    }

    const job = await refereeRatingJobRepository.upsertPendingJob(client, {
      assignmentId: ctx.assignment_id,
      playerId: ctx.player_id,
      refereeId: ctx.referee_id,
      bookingId: ctx.booking_id,
      fireAt: endsAt,
    });

    return { scheduled: Boolean(job), jobId: job?.job_id ?? null, fireAt: endsAt };
  } catch (err) {
    logger.warn('Failed to schedule referee rating prompt', {
      error: err.message,
      assignmentId,
    });
    return { scheduled: false, error: err.message };
  } finally {
    client.release();
  }
}

/** Send rating prompt now if match ended and player has not rated yet. */
export async function sendRefereeRatingPromptNow(assignmentId) {
  const client = await pool.connect();
  try {
    const ctx = await loadEligibleContext(client, assignmentId);
    if (!ctx) return { sent: false };

    await notifyPlayerRateReferee({
      playerId: ctx.player_id,
      assignmentId: ctx.assignment_id,
      bookingId: ctx.booking_id,
      refereeId: ctx.referee_id,
      venueName: ctx.venue_name,
      refereeName: ctx.referee_name,
    });

    const pending = await refereeRatingJobRepository.findPendingByAssignmentId(
      client,
      assignmentId,
    );
    if (pending) {
      await refereeRatingJobRepository.markSkipped(client, pending.job_id);
    }

    return { sent: true };
  } catch (err) {
    logger.warn('Failed to send referee rating prompt', {
      error: err.message,
      assignmentId,
    });
    return { sent: false, error: err.message };
  } finally {
    client.release();
  }
}

/** Worker: process due referee_rating_jobs. */
export async function processDueRefereeRatingJobs({ limit = 50 } = {}) {
  const client = await pool.connect();
  let due;
  try {
    due = await refereeRatingJobRepository.findDuePending(client, { limit });
  } finally {
    client.release();
  }

  const results = [];
  for (const job of due) {
    const jobClient = await pool.connect();
    try {
      const ctx = await loadEligibleContext(jobClient, job.assignment_id);
      if (!ctx) {
        await refereeRatingJobRepository.markSkipped(jobClient, job.job_id);
        results.push({ skipped: true, jobId: job.job_id });
        continue;
      }

      const notification = await notifyPlayerRateReferee({
        playerId: ctx.player_id,
        assignmentId: ctx.assignment_id,
        bookingId: ctx.booking_id,
        refereeId: ctx.referee_id,
        venueName: ctx.venue_name,
        refereeName: ctx.referee_name,
      });

      if (!notification) {
        await refereeRatingJobRepository.markFailed(jobClient, job.job_id);
        results.push({ failed: true, jobId: job.job_id });
        continue;
      }

      const marked = await refereeRatingJobRepository.markSent(
        jobClient,
        job.job_id,
        notification.notificationId,
      );
      results.push({
        sent: Boolean(marked),
        jobId: job.job_id,
        notificationId: notification.notificationId,
      });
    } catch (err) {
      logger.error('Referee rating job failed', {
        jobId: job.job_id,
        error: err.message,
      });
      try {
        await refereeRatingJobRepository.markFailed(jobClient, job.job_id);
      } catch {
        /* ignore */
      }
      results.push({ failed: true, jobId: job.job_id });
    } finally {
      jobClient.release();
    }
  }

  return {
    processed: results.length,
    sent: results.filter((r) => r.sent).length,
    failed: results.filter((r) => r.failed).length,
    skipped: results.filter((r) => r.skipped).length,
  };
}
