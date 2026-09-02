import { Router } from 'express';
import { authenticate, requireRole } from '../../shared/middleware/authenticate.js';
import { requireActiveUser } from '../../shared/middleware/requireActiveUser.js';
import { USER_ROLES } from '../../shared/constants/auth.js';
import config from '../../shared/config/env.js';
import * as refereeController from './controller/referee.controller.js';

const router = Router();

router.use(authenticate);
router.use(requireRole(USER_ROLES.REFEREE));
router.use(requireActiveUser);

router.get('/me', refereeController.getMe);
router.get('/me/certifications', refereeController.getCertifications);

router.get('/board', refereeController.getBoard);

router.get('/invitations', refereeController.getInvitations);
router.get('/assignments/:id', refereeController.getAssignment);
router.post('/assignments/:id/accept', refereeController.acceptAssignment);
router.post('/assignments/:id/decline', refereeController.declineAssignment);

router.get('/venues/registrations', refereeController.listVenueRegistrations);
router.post('/venues/:venueId/register', refereeController.registerVenue);
router.delete('/venues/:venueId/register', refereeController.cancelVenueRegistration);
router.post('/venues/:venueId/favorite', refereeController.favoriteVenue);
router.delete('/venues/:venueId/favorite', refereeController.unfavoriteVenue);

router.get('/schedule', refereeController.getSchedule);
router.get('/earnings', refereeController.getEarnings);
router.get('/earnings/history', refereeController.getEarningsHistory);
router.get('/earnings/monthly', refereeController.getEarningsMonthly);

if (config.node_env !== 'production') {
  router.post('/assignments/:id/dev/complete', refereeController.devCompleteAssignment);
}

export default router;
