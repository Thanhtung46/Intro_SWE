import { Router } from 'express';
import * as tournamentController from './controller/tournament.controller.js';
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
  tournamentController.create,
);
router.get('/', authenticate, tournamentController.list);
router.get('/mine', authenticate, tournamentController.mine);
router.get('/my-join-requests', authenticate, tournamentController.myJoinRequests);
router.post(
  '/:id/join',
  authenticate,
  requireRole(USER_ROLES.PLAYER),
  tournamentController.join,
);
router.delete(
  '/:id/join',
  authenticate,
  requireRole(USER_ROLES.PLAYER),
  tournamentController.withdrawJoin,
);
router.get('/:id/requests', authenticate, tournamentController.listRequests);
router.post(
  '/:id/requests/:requestId/accept',
  authenticate,
  tournamentController.acceptRequest,
);
router.post(
  '/:id/requests/:requestId/reject',
  authenticate,
  tournamentController.rejectRequest,
);
router.post('/:id/cancel', authenticate, tournamentController.cancel);
router.patch(
  '/:id',
  authenticate,
  requireRole(USER_ROLES.PLAYER),
  tournamentController.update,
);
router.post('/:id/complete', authenticate, tournamentController.complete);
router.post(
  '/:id/teams/:teamId/kick',
  authenticate,
  tournamentController.kickTeam,
);
router.post('/:id/favorite', authenticate, tournamentController.favorite);
router.delete('/:id/favorite', authenticate, tournamentController.unfavorite);
router.get('/:id/players', authenticate, tournamentController.players);
router.get('/:id/standings', authenticate, tournamentController.standings);
router.get('/:id/matches', authenticate, tournamentController.listMatches);
router.post('/:id/matches', authenticate, tournamentController.createMatch);
router.patch('/:id/matches/:matchId', authenticate, tournamentController.updateMatch);
router.patch(
  '/:id/matches/:matchId/result',
  authenticate,
  tournamentController.updateMatchResult,
);
router.delete(
  '/:id/matches/:matchId',
  authenticate,
  tournamentController.deleteMatch,
);
router.get('/:id', authenticate, tournamentController.detail);

export default router;
