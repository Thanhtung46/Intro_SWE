import { Router } from 'express';
import * as authController from './controller/auth.controller.js';
import { authenticate } from '../../shared/middleware/authenticate.js';

const router = Router();

router.get('/:id', authenticate, authController.getPublicProfile);

export default router;
