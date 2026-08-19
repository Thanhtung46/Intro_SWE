import { Router } from 'express';
import * as matchController from './controller/match.controller.js';
import {
  authenticate,
  requireRole,
} from '../../shared/middleware/authenticate.js';
import { USER_ROLES } from '../../shared/constants/auth.js';

const router = Router();

router.post(
  '/',
  authenticate,
  requireRole(USER_ROLES.PLAYER),
  matchController.create,
);
router.post(
  '/bulk',
  authenticate,
  requireRole(USER_ROLES.PLAYER),
  matchController.createBulk,
);
router.get('/', authenticate, matchController.list);
router.get('/mine', authenticate, matchController.mine);
router.get('/my-join-requests', authenticate, matchController.myJoinRequests);
router.get('/venue-suggestions', authenticate, matchController.venueSuggestions);
if (process.env.NODE_ENV !== 'production') {
  router.post(
    '/dev/process-expired',
    authenticate,
    matchController.processExpired,
  );
}
router.post(
  '/:id/join',
  authenticate,
  requireRole(USER_ROLES.PLAYER),
  matchController.join,
);
router.delete(
  '/:id/join',
  authenticate,
  requireRole(USER_ROLES.PLAYER),
  matchController.withdrawJoin,
);
router.get('/:id/requests', authenticate, matchController.listRequests);
router.post(
  '/:id/requests/:requestId/accept',
  authenticate,
  matchController.acceptRequest,
);
router.post(
  '/:id/requests/:requestId/reject',
  authenticate,
  matchController.rejectRequest,
);
router.post(
  '/:id/participants/:userId/kick',
  authenticate,
  matchController.kick,
);
router.post('/:id/cancel', authenticate, matchController.cancel);
router.post(
  '/:id/review',
  authenticate,
  requireRole(USER_ROLES.PLAYER),
  matchController.review,
);
router.post('/:id/favorite', authenticate, matchController.favorite);
router.delete('/:id/favorite', authenticate, matchController.unfavorite);
router.patch('/:id', authenticate, matchController.update);
router.get('/:id', authenticate, matchController.detail);

export default router;
