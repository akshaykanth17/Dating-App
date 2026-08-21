import { Router } from 'express';
import { HangoutController } from '../controllers/hangoutController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Protect all hangout routes
router.use(authMiddleware);

router.post('/', HangoutController.createHangout);
router.get('/', HangoutController.getHangoutsFeed);
router.post('/:id/like', HangoutController.likeHangout);

export default router;
