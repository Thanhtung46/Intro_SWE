import { Router } from 'express';
import * as authController from './controller/auth.controller.js';
import {
  createOtpRateLimiter,
  createLoginRateLimiter,
} from '../../shared/middleware/otpRateLimit.js';
import { authenticate } from '../../shared/middleware/authenticate.js';

const router = Router();
const otpRateLimiter = createOtpRateLimiter();
const loginRateLimiter = createLoginRateLimiter();

router.post('/register', authController.register);
router.post('/role', authController.selectRole);
router.post('/login', loginRateLimiter, authController.login);
router.post('/refresh', loginRateLimiter, authController.refresh);
router.get('/me', authenticate, authController.me);
router.patch('/me', authenticate, authController.updateMe);
router.post('/otp/verify', otpRateLimiter, authController.verifyOtp);
router.post('/otp/resend', otpRateLimiter, authController.resendOtp);
router.post(
  '/forgot-password',
  otpRateLimiter,
  authController.forgotPassword,
);
router.post(
  '/reset-password',
  otpRateLimiter,
  authController.resetPassword,
);

export default router;
