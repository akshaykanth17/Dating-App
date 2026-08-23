import { Router } from 'express';
import { SwipeController } from '../controllers/swipeController';
import { authMiddleware } from '../middleware/authMiddleware';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Swipe rate limit: 100 swipes per 15 minutes
const swipeLimiter = rateLimiter(15 * 60 * 1000, 100, 'swipe');

router.use(authMiddleware);

router.get('/discovery', SwipeController.getDiscoveryFeed);
router.get('/super-like-status', SwipeController.getSuperLikeStatus);
router.post('/reset', SwipeController.resetSwipes);
router.post('/undo', SwipeController.undoSwipe);
router.post('/', swipeLimiter, SwipeController.swipe);
router.get('/matches', SwipeController.getMatches);

export default router;
