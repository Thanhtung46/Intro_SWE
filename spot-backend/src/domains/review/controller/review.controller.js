import {
  parseCreateReviewDto,
  parseReplyReviewDto,
  parseReviewIdParam,
} from '../dto/create-review.dto.js';
import * as reviewService from '../service/review.service.js';

export async function create(req, res, next) {
  try {
    const dto = parseCreateReviewDto(req.body);
    const result = await reviewService.createReview(req.user.userId, dto);
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function reply(req, res, next) {
  try {
    const { id } = parseReviewIdParam(req.params);
    const dto = parseReplyReviewDto(req.body);
    const result = await reviewService.replyToReview(req.user.userId, id, dto);
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function venueRating(req, res, next) {
  try {
    const venueId = Number(req.params.venueId);
    if (!Number.isInteger(venueId) || venueId < 1) {
      return res.status(400).json({ message: 'Invalid venueId' });
    }
    const result = await reviewService.getVenueRating(venueId);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function seed(req, res, next) {
  try {
    const daysFromNow = req.body?.daysFromNow;
    const result = await reviewService.seedReviewBookingForUser(
      req.user.userId,
      { daysFromNow },
    );
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}
