import { Router } from 'express';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { getVnAdminTree } from '../../shared/constants/vn-admin.js';

const router = Router();

router.get('/vn', authenticate, (_req, res) => {
  res.status(200).json(getVnAdminTree());
});

export default router;
