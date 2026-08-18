import { Router } from 'express';
import * as reviewController from './controller/review.controller.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import config from '../../shared/config/env.js';

const router = Router();

router.post('/', authenticate, reviewController.create);
router.post('/:id/reply', authenticate, reviewController.reply);
router.get('/venues/:venueId/rating', authenticate, reviewController.venueRating);

if (config.node_env !== 'production') {
  router.post('/dev/seed-booking', authenticate, reviewController.seed);
}

export default router;
