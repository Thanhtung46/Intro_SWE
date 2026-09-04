import { Router } from 'express';
import { authenticate, requireRole } from '../../shared/middleware/authenticate.js';
import { USER_ROLES } from '../../shared/constants/auth.js';
import { requireActiveOwner } from './middleware/requireActiveOwner.js';
import { runFacilityImageUpload } from '../../shared/middleware/facilityImageUpload.js';
import * as dashboardController from './controller/dashboard.controller.js';
import * as facilityController from './controller/facility.controller.js';
import * as revenueController from './controller/revenue.controller.js';
import * as reviewsController from './controller/reviews.controller.js';
import * as scheduleController from './controller/schedule.controller.js';

const router = Router();

router.use(authenticate);
router.use(requireRole(USER_ROLES.OWNER));
router.use(requireActiveOwner());

router.get('/dashboard/summary', dashboardController.dashboardSummary);

router.get('/schedule', scheduleController.getSchedule);
router.post('/schedule/bookings', scheduleController.createBooking);
router.post('/schedule/bookings/:bookingId/cancel', scheduleController.cancelBooking);

router.get('/facilities/venues', facilityController.listVenues);
router.post('/facilities/venues', facilityController.createVenue);
router.get('/facilities/venues/:venueId', facilityController.getVenue);
router.patch('/facilities/venues/:venueId', facilityController.patchVenue);
router.post('/facilities/venues/:venueId/fields', facilityController.createField);
router.patch(
  '/facilities/venues/:venueId/fields/:fieldId',
  facilityController.patchField,
);
router.delete(
  '/facilities/venues/:venueId/fields/:fieldId',
  facilityController.deleteField,
);
router.put(
  '/facilities/venues/:venueId/fields/:fieldId/images',
  facilityController.replaceFieldImages,
);
router.put('/facilities/venues/:venueId/images', facilityController.replaceImages);
router.post(
  '/facilities/images/upload',
  runFacilityImageUpload,
  facilityController.uploadImages,
);

router.get('/revenue/summary', revenueController.revenueSummary);
router.get('/revenue/timeseries', revenueController.revenueTimeseries);
router.get('/revenue/export', revenueController.revenueExport);

router.get('/reviews', reviewsController.listReviews);
router.get('/reviews/:reviewId', reviewsController.getReview);
router.post('/reviews/:reviewId/reply', reviewsController.replyToReview);

export default router;
