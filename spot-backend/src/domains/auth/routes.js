import { Router } from 'express';
import * as authController from './controller/auth.controller.js';
import { createOtpRateLimiter } from '../../shared/middleware/otpRateLimit.js';

const router = Router();
const otpRateLimiter = createOtpRateLimiter();

router.post('/register', authController.register);
router.post('/otp/verify', otpRateLimiter, authController.verifyOtp);
router.post('/otp/resend', otpRateLimiter, authController.resendOtp);

export default router;
