import pool from '../../../shared/database/pool.js';
import redis from '../../../shared/database/redis.js';
import logger from '../../../shared/utils/logger.js';
import { AppError } from '../../../shared/middleware/errorHandler.js';
import {
  REVIEW_MAX_PER_PLAYER_PER_DAY,
  VENUE_RATING_REDIS_PREFIX,
  VENUE_RATING_REDIS_TTL_SECONDS,
} from '../../../shared/constants/review.js';
import * as reviewRepository from '../repository/review.repository.js';
import {
  toPublicReview,
  toPublicReply,
  toPublicVenueRating,
} from '../entity/review.entity.js';
import * as bookingService from '../../booking/service/booking.service.js';
import * as notificationService from '../../notification/service/notification.service.js';
import { NOTIFICATION_TYPES } from '../../../shared/constants/notification.js';

async function ensureRedis() {
  if (redis.status === 'ready') return;
  if (redis.status === 'connecting' || redis.status === 'connect') return;
  if (redis.status === 'wait' || redis.status === 'end' || redis.status === 'close') {
    await redis.connect();
  }
}

function venueRatingKey(venueId) {
  return `${VENUE_RATING_REDIS_PREFIX}${venueId}`;
}

async function cacheVenueRating(venueRating) {
  if (!venueRating) return;
  try {
    await ensureRedis();
    const payload = JSON.stringify({
      venueId: venueRating.venue_id,
      avgRating: Number(venueRating.avg_rating),
      ratingCount: Number(venueRating.rating_count),
    });
    await redis.set(
      venueRatingKey(venueRating.venue_id),
      payload,
      'EX',
      VENUE_RATING_REDIS_TTL_SECONDS,
    );
  } catch (err) {
    logger.warn('Failed to cache venue rating', { error: err.message });
  }
}

async function invalidateVenueRatingCache(venueId) {
  try {
    await ensureRedis();
    await redis.del(venueRatingKey(venueId));
  } catch (err) {
    logger.warn('Failed to invalidate venue rating cache', {
      error: err.message,
    });
  }
}

export async function createReview(userId, dto) {
  const playerId = Number(userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const booking = await reviewRepository.findCompletedBookingForPlayer(
      client,
      { bookingId: dto.bookingId, playerId },
    );
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }
    if (booking.status !== 'COMPLETED') {
      throw new AppError('Only completed bookings can be reviewed', 400);
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await reviewRepository.countPlayerReviewsSince(
      client,
      playerId,
      since,
    );
    if (recentCount >= REVIEW_MAX_PER_PLAYER_PER_DAY) {
      throw new AppError('Too many reviews in the last 24 hours', 429);
    }

    let review;
    try {
      review = await reviewRepository.insertReview(client, {
        bookingId: dto.bookingId,
        venueId: booking.venue_id,
        playerId,
        rating: dto.rating,
        reviewText: dto.reviewText ?? null,
      });
    } catch (err) {
      if (err.code === '23505') {
        throw new AppError('This booking already has a review', 409);
      }
      throw err;
    }

    const venueRating = await reviewRepository.refreshVenueRating(
      client,
      booking.venue_id,
    );
    await client.query('COMMIT');

    try {
      await notificationService.createNotification({
        userId: booking.venue_owner_id,
        type: NOTIFICATION_TYPES.OWNER_NEW_REVIEW,
        title: `New ${dto.rating}-star review`,
        body: dto.reviewText
          ? dto.reviewText.slice(0, 140)
          : `A customer left a ${dto.rating}-star review.`,
        data: { reviewId: review.review_id, venueId: booking.venue_id },
        sendEmail: false,
      });
    } catch (err) {
      // Non-fatal: review succeeded, notification is best-effort.
    }

    await invalidateVenueRatingCache(booking.venue_id);
    await cacheVenueRating(venueRating);

    return {
      review: toPublicReview(review),
      venueRating: toPublicVenueRating(venueRating),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function replyToReview(userId, reviewId, dto) {
  const ownerId = Number(userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const review = await reviewRepository.findReviewById(client, reviewId);
    if (!review) {
      throw new AppError('Review not found', 404);
    }
    if (Number(review.venue_owner_id) !== ownerId) {
      throw new AppError('Only the venue owner can reply to this review', 403);
    }

    const existing = await reviewRepository.findReplyByReviewId(
      client,
      reviewId,
    );
    if (existing) {
      throw new AppError('This review already has a reply', 409);
    }

    let reply;
    try {
      reply = await reviewRepository.insertReply(client, {
        reviewId,
        ownerId,
        replyText: dto.replyText,
      });
    } catch (err) {
      if (err.code === '23505') {
        throw new AppError('This review already has a reply', 409);
      }
      throw err;
    }

    await client.query('COMMIT');

    return {
      review: toPublicReview(review, reply),
      reply: toPublicReply(reply),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getVenueRating(venueId) {
  try {
    await ensureRedis();
    const cached = await redis.get(venueRatingKey(venueId));
    if (cached) {
      return { ...JSON.parse(cached), source: 'cache' };
    }
  } catch (err) {
    logger.warn('Failed to read venue rating cache', { error: err.message });
  }

  const client = await pool.connect();
  try {
    const row = await reviewRepository.getVenueRating(client, venueId);
    if (!row) {
      throw new AppError('Venue not found', 404);
    }
    await cacheVenueRating(row);
    return { ...toPublicVenueRating(row), source: 'db' };
  } finally {
    client.release();
  }
}

/**
 * Dev/smoke: create COMPLETED booking (+ optional match) then return ids for review.
 */
export async function seedReviewBookingForUser(userId, input = {}) {
  const seeded = await bookingService.seedScheduleForUser(userId, {
    includeMatch: false,
    daysFromNow: input.daysFromNow ?? 1,
  });

  const client = await pool.connect();
  try {
    const booking = await reviewRepository.markBookingCompleted(
      client,
      seeded.booking.bookingId,
      userId,
    );
    if (!booking) {
      throw new AppError('Failed to mark booking completed', 500);
    }
    return {
      ...seeded,
      booking: {
        ...seeded.booking,
        status: booking.status,
      },
    };
  } finally {
    client.release();
  }
}
