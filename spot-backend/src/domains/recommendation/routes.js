import { Router } from 'express';
import * as recommendationController from './controller/recommendation.controller.js';
import { authenticate, requireRole } from '../../shared/middleware/authenticate.js';
import { USER_ROLES } from '../../shared/constants/auth.js';

const router = Router();

router.get(
  '/',
  authenticate,
  requireRole(USER_ROLES.PLAYER),
  recommendationController.getRecommendations,
);

export default router;
