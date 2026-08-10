import { Router } from 'express';
import * as authController from './controller/auth.controller.js';
import {
  createOtpRateLimiter,
  createLoginRateLimiter,
} from '../../shared/middleware/otpRateLimit.js';

const router = Router();
const otpRateLimiter = createOtpRateLimiter();
const loginRateLimiter = createLoginRateLimiter();

router.post('/register', authController.register);
router.post('/role', authController.selectRole);
router.post('/login', loginRateLimiter, authController.login);
router.post('/otp/verify', otpRateLimiter, authController.verifyOtp);
router.post('/otp/resend', otpRateLimiter, authController.resendOtp);

export default router;
