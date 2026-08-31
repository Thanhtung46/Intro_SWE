import { Router } from 'express';
import * as groupController from './controller/group.controller.js';
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
  groupController.create,
);
router.get('/', authenticate, groupController.list);
router.get('/mine', authenticate, groupController.mine);
router.get('/my-join-requests', authenticate, groupController.myJoinRequests);
router.post(
  '/:id/join',
  authenticate,
  requireRole(USER_ROLES.PLAYER),
  groupController.join,
);
router.delete(
  '/:id/join',
  authenticate,
  requireRole(USER_ROLES.PLAYER),
  groupController.withdrawJoin,
);
router.post(
  '/:id/leave',
  authenticate,
  requireRole(USER_ROLES.PLAYER),
  groupController.leave,
);
router.get('/:id/requests', authenticate, groupController.listRequests);
router.post(
  '/:id/requests/:requestId/accept',
  authenticate,
  groupController.acceptRequest,
);
router.post(
  '/:id/requests/:requestId/reject',
  authenticate,
  groupController.rejectRequest,
);
router.post(
  '/:id/members/:userId/kick',
  authenticate,
  groupController.kick,
);
router.post(
  '/:id/members/:userId/transfer-admin',
  authenticate,
  groupController.transferAdmin,
);
router.post('/:id/favorite', authenticate, groupController.favorite);
router.delete('/:id/favorite', authenticate, groupController.unfavorite);
router.patch(
  '/:id',
  authenticate,
  requireRole(USER_ROLES.PLAYER),
  groupController.update,
);
router.get('/:id/members', authenticate, groupController.members);
router.get('/:id/schedule', authenticate, groupController.schedule);
router.get('/:id/gallery', authenticate, groupController.galleryList);
router.post(
  '/:id/gallery',
  authenticate,
  requireRole(USER_ROLES.PLAYER),
  groupController.galleryAdd,
);
router.delete(
  '/:id/gallery/:imageId',
  authenticate,
  requireRole(USER_ROLES.PLAYER),
  groupController.galleryRemove,
);
router.delete(
  '/:id',
  authenticate,
  requireRole(USER_ROLES.PLAYER),
  groupController.remove,
);
router.get('/:id', authenticate, groupController.detail);

export default router;
