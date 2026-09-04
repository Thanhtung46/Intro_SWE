import * as recommendationService from '../service/recommendation.service.js';

export async function getRecommendations(req, res, next) {
  try {
    const { sport, limit, latitude, longitude, radiusKm } = req.query;
    const { status, body } = await recommendationService.getRecommendations(
      req.user.userId,
      { sport, limit, latitude, longitude, radiusKm },
    );
    return res.status(status).json(body);
  } catch (err) {
    return next(err);
  }
}
