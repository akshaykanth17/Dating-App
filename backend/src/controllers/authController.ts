import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import { getQueueService } from '../services/queueService';

const prisma = new PrismaClient();
const queueService = getQueueService();

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'heartsync_jwt_access_secret_change_me_in_production_12345';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'heartsync_jwt_refresh_secret_change_me_in_production_12345';

// Helper function to check if user is 18+
function getAge(birthdate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const m = today.getMonth() - birthdate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) {
    age--;
  }
  return age;
}

export class AuthController {
  static async register(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email is already registered' });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: { email, passwordHash, isVerified: true, isOnboarded: false },
      });

      const accessToken = jwt.sign({ userId: user.id }, ACCESS_TOKEN_SECRET, { expiresIn: '7d' });

      return res.status(201).json({
        message: 'Registration successful. Please complete your profile.',
        accessToken,
        user: { id: user.id, email: user.email, isVerified: true, isOnboarded: false },
      });
    } catch (error) {
      console.error('[AuthController.register] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async verifyEmail(req: Request, res: Response) {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    try {
      const user = await prisma.user.findFirst({
        where: { verificationToken: token },
      });

      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired verification token' });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          isVerified: true,
          verificationToken: null,
        },
      });

      return res.status(200).json({ message: 'Email verified successfully! You can now log in.' });
    } catch (error) {
      console.error('[AuthController.verifyEmail] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async login(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { profile: { include: { photos: true } } },
      });

      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const accessToken = jwt.sign({ userId: user.id }, ACCESS_TOKEN_SECRET, { expiresIn: '7d' });

      return res.status(200).json({
        message: 'Login successful',
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          isVerified: user.isVerified,
          isOnboarded: user.isOnboarded,
          authProvider: user.authProvider,
          profile: user.profile,
        },
      });
    } catch (error) {
      console.error('[AuthController.login] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /api/auth/me — returns current user info
  static async getCurrentUser(req: any, res: Response) {
    const userId = req.userId;
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.status(200).json({
        id: user.id,
        email: user.email,
        isVerified: user.isVerified,
        isOnboarded: user.isOnboarded,
        authProvider: user.authProvider,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST /api/auth/demo-login — logs in as first seed user (for testing)
  static async demoLogin(req: Request, res: Response) {
    try {
      const mockUser = await prisma.user.findFirst({
        where: { email: { endsWith: '@seed.heartsync.app' } },
        include: { profile: { include: { photos: true } } },
      });
      if (!mockUser) return res.status(404).json({ error: 'No demo user found. Run seed script first.' });

      const accessToken = jwt.sign({ userId: mockUser.id }, ACCESS_TOKEN_SECRET, { expiresIn: '7d' });
      return res.status(200).json({
        accessToken,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          isVerified: true,
          isOnboarded: true,
          authProvider: 'demo',
          profile: mockUser.profile,
        },
      });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async refresh(req: Request, res: Response) {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    try {
      const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as { userId: string };
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });

      if (!user) {
        return res.status(401).json({ error: 'User does not exist' });
      }

      const newAccessToken = jwt.sign({ userId: user.id }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
      const newRefreshToken = jwt.sign({ userId: user.id }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

      return res.status(200).json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
  }

  static async requestPasswordReset(req: Request, res: Response) {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        // Return 200 message anyway to prevent user enumeration attacks
        return res.status(200).json({ message: 'If that email exists, we have sent a reset password link.' });
      }

      const resetToken = uuidv4();
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpires: expires,
        },
      });

      await queueService.addJob('email', 'sendReset', {
        email: user.email,
        token: resetToken,
        type: 'reset',
      });

      return res.status(200).json({ message: 'If that email exists, we have sent a reset password link.' });
    } catch (error) {
      console.error('[AuthController.requestPasswordReset] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    try {
      const user = await prisma.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpires: { gt: new Date() },
        },
      });

      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      });

      return res.status(200).json({ message: 'Password reset successfully. You can now log in.' });
    } catch (error) {
      console.error('[AuthController.resetPassword] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
