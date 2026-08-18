import { Router } from 'express';
import { authenticate } from '../../shared/middleware/authenticate.js';
import * as venueController from './controller/venue.controller.js';
import * as bookingController from '../booking/controller/booking.controller.js';

const router = Router();

router.get('/', authenticate, venueController.list);
router.get('/:venueId', authenticate, venueController.detail);
router.get('/:venueId/images', authenticate, venueController.images);
router.get(
  '/:venueId/fields/:fieldId/availability',
  authenticate,
  bookingController.availability,
);

export default router;
