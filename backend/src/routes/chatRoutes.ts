import { Router } from 'express';
import { ChatController } from '../controllers/chatController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/:matchId', ChatController.getChatHistory);

export default router;
