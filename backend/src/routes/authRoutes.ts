import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { rateLimiter } from '../middleware/rateLimiter';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

const authLimiter = rateLimiter(15 * 60 * 1000, 15, 'auth');
const resetLimiter = rateLimiter(15 * 60 * 1000, 5, 'reset');

router.post('/register', authLimiter, AuthController.register);
router.post('/login', authLimiter, AuthController.login);
router.post('/demo-login', AuthController.demoLogin);
router.get('/me', authMiddleware, AuthController.getCurrentUser);
router.get('/verify-email', AuthController.verifyEmail);
router.post('/refresh', AuthController.refresh);
router.post('/forgot-password', resetLimiter, AuthController.requestPasswordReset);
router.post('/reset-password', resetLimiter, AuthController.resetPassword);

export default router;
