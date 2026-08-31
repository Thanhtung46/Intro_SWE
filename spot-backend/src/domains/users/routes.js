import { Router } from 'express';
import * as usersController from './controller/users.controller.js';
import { createOtpRateLimiter } from '../../shared/middleware/otpRateLimit.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { runAvatarUpload } from '../../shared/middleware/avatarUpload.js';
import { runVerificationUpload } from '../../shared/middleware/verificationUpload.js';
import config from '../../shared/config/env.js';

const router = Router();
const otpRateLimiter = createOtpRateLimiter();

router.get('/me', authenticate, usersController.me);
router.get('/me/profile', authenticate, usersController.getMainProfile);
router.patch('/me', authenticate, usersController.updateMe);
router.get('/me/preferences', authenticate, usersController.getPreferences);
router.patch('/me/preferences', authenticate, usersController.updatePreferences);
router.post('/me/password', authenticate, otpRateLimiter, usersController.changePassword);
router.post(
  '/me/avatar',
  authenticate,
  runAvatarUpload,
  usersController.uploadAvatar,
);
router.post(
  '/me/verification-documents',
  authenticate,
  runVerificationUpload,
  usersController.uploadVerificationDocument,
);
router.post(
  '/me/verification-requests',
  authenticate,
  usersController.submitVerificationRequest,
);
router.post(
  '/me/verification-requests/batch',
  authenticate,
  usersController.submitVerificationBatch,
);
router.post(
  '/me/verification-requests/cert-update',
  authenticate,
  usersController.submitCertUpdate,
);
router.get('/me/schedule', authenticate, usersController.getMySchedule);

if (config.node_env !== 'production') {
  router.post('/me/schedule/dev/seed', authenticate, usersController.seedMySchedule);
}
router.post(
  '/me/email/request',
  authenticate,
  otpRateLimiter,
  usersController.requestEmailChange,
);
router.post(
  '/me/email/confirm',
  authenticate,
  otpRateLimiter,
  usersController.confirmEmailChange,
);
router.post(
  '/me/phone/request',
  authenticate,
  otpRateLimiter,
  usersController.requestPhoneChange,
);
router.post(
  '/me/phone/confirm',
  authenticate,
  otpRateLimiter,
  usersController.confirmPhoneChange,
);

export default router;
