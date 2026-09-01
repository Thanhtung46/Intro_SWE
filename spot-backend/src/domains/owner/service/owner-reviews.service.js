import pool from '../../../shared/database/pool.js';
import { AppError } from '../../../shared/middleware/errorHandler.js';
import * as ownerReviewsRepository from '../repository/owner-reviews.repository.js';
import * as reviewService from '../../review/service/review.service.js';
import {
  toOwnerReviewListItem,
  toOwnerReviewDetail,
} from '../entity/owner.entity.js';

export async function listReviews(ownerId, query) {
  const client = await pool.connect();
  try {
    const { rows, total } = await ownerReviewsRepository.listReviewsForOwner(
      client,
      ownerId,
      query,
    );
    return {
      items: rows.map(toOwnerReviewListItem),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  } finally {
    client.release();
  }
}

export async function getReviewDetail(ownerId, reviewId) {
  const client = await pool.connect();
  try {
    const row = await ownerReviewsRepository.findReviewDetailForOwner(
      client,
      reviewId,
      ownerId,
    );
    if (!row) {
      throw new AppError('Review not found', 404);
    }
    return { review: toOwnerReviewDetail(row) };
  } finally {
    client.release();
  }
}

export async function replyToReview(ownerId, reviewId, dto) {
  return reviewService.replyToReview(ownerId, reviewId, dto);
}
