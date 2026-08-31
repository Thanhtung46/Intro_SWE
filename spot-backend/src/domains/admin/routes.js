import { Router } from 'express';
import { authenticate, requireRole } from '../../shared/middleware/authenticate.js';
import { USER_ROLES } from '../../shared/constants/auth.js';
import * as adminController from './controller/admin.controller.js';

const router = Router();

router.use(authenticate);
router.use(requireRole(USER_ROLES.ADMIN));

router.get('/dashboard/summary', adminController.dashboardSummary);

router.get('/approvals', adminController.listApprovals);
router.get('/approvals/:id', adminController.getApproval);
router.post('/approvals/:id/approve', adminController.approveApproval);
router.post('/approvals/:id/reject', adminController.rejectApproval);

router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUser);
router.patch('/users/:id', adminController.patchUser);

router.get('/settings', adminController.getSettings);
router.patch('/settings', adminController.patchSettings);

router.get('/audit-log', adminController.listAuditLog);

export default router;
