import { Router } from 'express';
import { listActivityLogs } from './activityLog.controller';
import { authenticate } from '../../middlewares/authenticate';
import { requireTenant } from '../../middlewares/tenantScope';
import { authorize } from '../../middlewares/authorize';

const router = Router();

router.use(authenticate);
router.get('/', requireTenant, authorize('org_owner'), listActivityLogs);

export default router;