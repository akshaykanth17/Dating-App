import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Rate limit: 15 requests per 15 minutes for registering and logging in
const authLimiter = rateLimiter(15 * 60 * 1000, 15, 'auth');
// Rate limit: 5 requests per 15 minutes for password resets
const resetLimiter = rateLimiter(15 * 60 * 1000, 5, 'reset');

router.post('/register', authLimiter, AuthController.register);
router.get('/verify-email', AuthController.verifyEmail);
router.post('/login', authLimiter, AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/forgot-password', resetLimiter, AuthController.requestPasswordReset);
router.post('/reset-password', resetLimiter, AuthController.resetPassword);

export default router;
