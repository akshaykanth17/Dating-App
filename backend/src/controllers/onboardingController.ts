import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

function getAge(birthdate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const m = today.getMonth() - birthdate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) age--;
  return age;
}

export class OnboardingController {
  /**
   * POST /api/onboarding/profile
   * Step 1-3: Save name, DOB, gender, location, preferences.
   * Enforces 18+ age gate.
   */
  static async saveProfile(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const {
      name,
      birthdate,
      gender,
      bio,
      latitude,
      longitude,
      gendersInterestedIn,
      ageInterestedInMin,
      ageInterestedInMax,
    } = req.body;

    if (!name || !birthdate || !gender || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Name, birthdate, gender, and location are required' });
    }

    const birthdateObj = new Date(birthdate);
    if (isNaN(birthdateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid birthdate format' });
    }

    const age = getAge(birthdateObj);
    if (age < 18) {
      return res.status(400).json({
        error: 'You must be at least 18 years old to use HeartSync.',
        code: 'UNDERAGE',
      });
    }

    try {
      // Upsert profile (create if doesn't exist, update if it does)
      const profile = await prisma.profile.upsert({
        where: { userId },
        update: {
          name,
          birthdate: birthdateObj,
          gender,
          bio: bio || '',
          latitude: Number(latitude),
          longitude: Number(longitude),
          gendersInterestedIn: gendersInterestedIn || ['male', 'female'],
          ageInterestedInMin: Number(ageInterestedInMin) || 18,
          ageInterestedInMax: Number(ageInterestedInMax) || 60,
        },
        create: {
          userId,
          name,
          birthdate: birthdateObj,
          gender,
          bio: bio || '',
          latitude: Number(latitude),
          longitude: Number(longitude),
          gendersInterestedIn: gendersInterestedIn || ['male', 'female'],
          ageInterestedInMin: Number(ageInterestedInMin) || 18,
          ageInterestedInMax: Number(ageInterestedInMax) || 60,
          distanceInterestedIn: 50,
        },
      });

      return res.status(200).json({ message: 'Profile saved', profile });
    } catch (error) {
      console.error('[OnboardingController.saveProfile] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /api/onboarding/complete
   * Final step: Mark user as onboarded (requires at least 1 photo in DB).
   */
  static async completeOnboarding(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;

    try {
      const profile = await prisma.profile.findUnique({
        where: { userId },
        include: { photos: true },
      });

      if (!profile) {
        return res.status(400).json({ error: 'Please complete your profile first' });
      }

      if (profile.photos.length === 0) {
        return res.status(400).json({
          error: 'You must upload at least one photo to continue.',
          code: 'NO_PHOTO',
        });
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { isOnboarded: true },
      });

      return res.status(200).json({
        message: 'Onboarding complete! Welcome to HeartSync.',
        isOnboarded: user.isOnboarded,
      });
    } catch (error) {
      console.error('[OnboardingController.completeOnboarding] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
