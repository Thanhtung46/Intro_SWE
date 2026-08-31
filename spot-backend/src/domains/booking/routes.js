import { Router } from 'express';
import { authenticate } from '../../shared/middleware/authenticate.js';
import * as bookingController from './controller/booking.controller.js';

const router = Router();

router.post('/', authenticate, bookingController.create);
router.post('/bulk', authenticate, bookingController.createBulk);

export default router;
