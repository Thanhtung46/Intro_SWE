import { Router } from 'express';
import * as assistantController from './controller/assistant.controller.js';
import {
  authenticate,
  requireRole,
} from '../../shared/middleware/authenticate.js';
import { createPlayerRateLimiter } from '../../shared/middleware/otpRateLimit.js';
import { USER_ROLES } from '../../shared/constants/auth.js';

const router = Router();
const assistantRateLimiter = createPlayerRateLimiter();

router.post(
  '/conversations/:conversationId/messages',
  authenticate,
  requireRole(USER_ROLES.PLAYER),
  assistantRateLimiter,
  assistantController.sendMessage,
);
router.get(
  '/conversations/:conversationId',
  authenticate,
  requireRole(USER_ROLES.PLAYER),
  assistantController.getHistory,
);
router.delete(
  '/conversations/:conversationId',
  authenticate,
  requireRole(USER_ROLES.PLAYER),
  assistantController.clearConversation,
);

export default router;
