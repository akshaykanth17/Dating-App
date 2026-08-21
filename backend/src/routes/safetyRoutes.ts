import { Router } from 'express';
import { SafetyController } from '../controllers/safetyController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.post('/block', SafetyController.blockUser);
router.post('/report', SafetyController.reportUser);

export default router;
