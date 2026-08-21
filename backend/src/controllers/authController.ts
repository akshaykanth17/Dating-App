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
    const { email, password, name, birthdate, gender, latitude, longitude, gendersInterestedIn } = req.body;

    if (!email || !password || !name || !birthdate || !gender || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const birthDateObj = new Date(birthdate);
    if (isNaN(birthDateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid birthdate format' });
    }

    // 18+ Age Gate Check
    const age = getAge(birthDateObj);
    if (age < 18) {
      return res.status(400).json({ error: 'You must be at least 18 years old to join HeartSync.' });
    }

    try {
      // Check existing user
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email is already registered' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);
      const verificationToken = uuidv4();

      // Create user and profile in a single transaction
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          verificationToken,
          profile: {
            create: {
              name,
              birthdate: birthDateObj,
              gender,
              bio: '',
              latitude: Number(latitude),
              longitude: Number(longitude),
              gendersInterestedIn: gendersInterestedIn || (gender === 'male' ? ['female'] : ['male']),
            },
          },
        },
        include: {
          profile: true,
        },
      });

      // Queue verification email
      await queueService.addJob('email', 'sendVerification', {
        email: user.email,
        token: verificationToken,
        type: 'verification',
      });

      return res.status(201).json({
        message: 'Registration successful. A verification email has been sent.',
        userId: user.id,
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

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Check password match
      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Generate tokens
      const accessToken = jwt.sign({ userId: user.id }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
      const refreshToken = jwt.sign({ userId: user.id }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

      return res.status(200).json({
        message: 'Login successful',
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          isVerified: user.isVerified,
          profile: user.profile ? {
            id: user.profile.id,
            name: user.profile.name,
            birthdate: user.profile.birthdate,
            gender: user.profile.gender,
            bio: user.profile.bio,
            latitude: user.profile.latitude,
            longitude: user.profile.longitude,
            photos: user.profile.photos,
          } : null,
        },
      });
    } catch (error) {
      console.error('[AuthController.login] Error:', error);
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
