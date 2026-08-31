import * as ownerReviewsService from '../service/owner-reviews.service.js';
import { parseListOwnerReviewsDto, parseOwnerReviewIdParam } from '../dto/reviews.dto.js';
import { parseReplyReviewDto } from '../../review/dto/create-review.dto.js';

export async function listReviews(req, res, next) {
  try {
    const query = parseListOwnerReviewsDto(req.query);
    const result = await ownerReviewsService.listReviews(req.user.userId, query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function getReview(req, res, next) {
  try {
    const { reviewId } = parseOwnerReviewIdParam(req.params);
    const result = await ownerReviewsService.getReviewDetail(
      req.user.userId,
      reviewId,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function replyToReview(req, res, next) {
  try {
    const { reviewId } = parseOwnerReviewIdParam(req.params);
    const dto = parseReplyReviewDto(req.body);
    const result = await ownerReviewsService.replyToReview(
      req.user.userId,
      reviewId,
      dto,
    );
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}
