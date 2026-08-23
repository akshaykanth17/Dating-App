import { Response } from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { getStorageService } from '../services/storageService';

const prisma = new PrismaClient();
const storageService = getStorageService();

const calculateProfileCompletion = (profile: any) => {
  let score = 0;
  let total = 0;

  const checkField = (field: any) => {
    total++;
    if (field !== null && field !== undefined && field !== '' && (Array.isArray(field) ? field.length > 0 : true)) {
      score++;
    }
  };

  checkField(profile.name);
  checkField(profile.bio);
  checkField(profile.photos?.length > 0 ? profile.photos : null);
  checkField(profile.interests?.length > 0 ? profile.interests : null);
  checkField(profile.favoriteSpot);
  checkField(profile.job);
  checkField(profile.education);
  checkField(profile.drinking);
  checkField(profile.smoking);
  checkField(profile.gym);
  checkField(profile.height);
  checkField(profile.weight);
  checkField(profile.prompts?.length > 0 ? profile.prompts : null);

  if (total === 0) return 0;
  return Math.round((score / total) * 100);
};

export class ProfileController {
  static async getMyProfile(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;

    try {
      const profile = await prisma.profile.findUnique({
        where: { userId },
        include: { photos: true, prompts: true },
      });

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      const completionPercentage = calculateProfileCompletion(profile);

      return res.status(200).json({ ...profile, completionPercentage });
    } catch (error) {
      console.error('[ProfileController.getMyProfile] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const { 
      name, bio, gender, birthdate, latitude, longitude, 
      ageInterestedInMin, ageInterestedInMax, distanceInterestedIn, gendersInterestedIn,
      interests, favoriteSpot, job, education, drinking, smoking, gym, height, weight, prompts
    } = req.body;

    try {
      const profile = await prisma.profile.findUnique({ where: { userId } });
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      // Build update data object
      const updateData: any = {};
      if (name) updateData.name = name;
      if (bio !== undefined) updateData.bio = bio;
      if (gender) updateData.gender = gender;
      if (latitude !== undefined) updateData.latitude = Number(latitude);
      if (longitude !== undefined) updateData.longitude = Number(longitude);
      if (ageInterestedInMin !== undefined) updateData.ageInterestedInMin = Number(ageInterestedInMin);
      if (ageInterestedInMax !== undefined) updateData.ageInterestedInMax = Number(ageInterestedInMax);
      if (distanceInterestedIn !== undefined) updateData.distanceInterestedIn = Number(distanceInterestedIn);
      if (gendersInterestedIn) updateData.gendersInterestedIn = gendersInterestedIn;
      
      // New fields
      if (interests) updateData.interests = interests;
      if (favoriteSpot !== undefined) updateData.favoriteSpot = favoriteSpot;
      if (job !== undefined) updateData.job = job;
      if (education !== undefined) updateData.education = education;
      if (drinking !== undefined) updateData.drinking = drinking;
      if (smoking !== undefined) updateData.smoking = smoking;
      if (gym !== undefined) updateData.gym = gym;
      if (height !== undefined) updateData.height = Number(height) || null;
      if (weight !== undefined) updateData.weight = Number(weight) || null;

      if (birthdate) {
        const birthDateObj = new Date(birthdate);
        if (isNaN(birthDateObj.getTime())) {
          return res.status(400).json({ error: 'Invalid birthdate format' });
        }
        // Age check
        const today = new Date();
        let age = today.getFullYear() - birthDateObj.getFullYear();
        const m = today.getMonth() - birthDateObj.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
          age--;
        }
        if (age < 18) {
          return res.status(400).json({ error: 'Age must be 18+' });
        }
        updateData.birthdate = birthDateObj;
      }

      // Handle prompts update
      if (prompts && Array.isArray(prompts)) {
        await prisma.prompt.deleteMany({ where: { profileId: profile.id } });
        if (prompts.length > 0) {
          await prisma.prompt.createMany({
            data: prompts.map((p: any) => ({
              profileId: profile.id,
              question: p.question,
              answer: p.answer,
            })),
          });
        }
      }

      const updatedProfile = await prisma.profile.update({
        where: { userId },
        data: updateData,
        include: { photos: true, prompts: true },
      });

      const completionPercentage = calculateProfileCompletion(updatedProfile);

      return res.status(200).json({ ...updatedProfile, completionPercentage });
    } catch (error) {
      console.error('[ProfileController.updateProfile] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async uploadPhoto(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No photo file provided' });
    }

    try {
      const profile = await prisma.profile.findUnique({
        where: { userId },
        include: { photos: true },
      });

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      // Limit to 6 photos max
      if (profile.photos.length >= 6) {
        return res.status(400).json({ error: 'Maximum of 6 photos allowed' });
      }

      // Process and upload file
      const fileUrl = await storageService.uploadPhoto(file);

      // Determine if this should be the primary photo (first uploaded photo is primary)
      const isPrimary = profile.photos.length === 0;

      const photo = await prisma.photo.create({
        data: {
          profileId: profile.id,
          url: fileUrl,
          isPrimary,
        },
      });

      return res.status(201).json(photo);
    } catch (error) {
      console.error('[ProfileController.uploadPhoto] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async deletePhoto(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const { photoId } = req.params;

    try {
      const profile = await prisma.profile.findUnique({
        where: { userId },
        include: { photos: true },
      });

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      const photo = profile.photos.find((p) => p.id === photoId);
      if (!photo) {
        return res.status(404).json({ error: 'Photo not found on this profile' });
      }

      // Enforce at least 1 photo must remain
      if (profile.photos.length <= 1) {
        return res.status(400).json({ error: 'You must keep at least one profile photo' });
      }

      // Delete from storage
      await storageService.deletePhoto(photo.url);

      // Delete from DB
      await prisma.photo.delete({ where: { id: photoId } });

      // If we deleted the primary photo, promote another photo if possible
      if (photo.isPrimary && profile.photos.length > 1) {
        const remainingPhotos = profile.photos.filter((p) => p.id !== photoId);
        if (remainingPhotos.length > 0) {
          await prisma.photo.update({
            where: { id: remainingPhotos[0].id },
            data: { isPrimary: true },
          });
        }
      }

      return res.status(200).json({ message: 'Photo deleted successfully' });
    } catch (error) {
      console.error('[ProfileController.deletePhoto] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async setPrimaryPhoto(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const { photoId } = req.params;

    try {
      const profile = await prisma.profile.findUnique({
        where: { userId },
        include: { photos: true },
      });

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      const photoExists = profile.photos.some((p) => p.id === photoId);
      if (!photoExists) {
        return res.status(404).json({ error: 'Photo not found on this profile' });
      }

      // Reset all photos isPrimary to false, and set target photo to true
      await prisma.$transaction([
        prisma.photo.updateMany({
          where: { profileId: profile.id },
          data: { isPrimary: false },
        }),
        prisma.photo.update({
          where: { id: photoId },
          data: { isPrimary: true },
        }),
      ]);

      return res.status(200).json({ message: 'Primary photo updated successfully' });
    } catch (error) {
      console.error('[ProfileController.setPrimaryPhoto] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async changePassword(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (!user.passwordHash) {
        return res.status(400).json({ error: 'Cannot change password for accounts signed up with Google' });
      }

      const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!passwordMatch) {
        return res.status(400).json({ error: 'Incorrect current password' });
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      });

      return res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('[ProfileController.changePassword] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async deleteAccount(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;

    try {
      // 1. Fetch profile to delete photos from storage first
      const profile = await prisma.profile.findUnique({
        where: { userId },
        include: { photos: true },
      });

      if (profile && profile.photos.length > 0) {
        for (const photo of profile.photos) {
          try {
            await storageService.deletePhoto(photo.url);
          } catch (storageErr) {
            console.error(`[ProfileController.deleteAccount] Failed to delete photo file: ${photo.url}`, storageErr);
          }
        }
      }

      // 2. Delete user (cascades database deletions for Profile, Matches, Swipes, Messages, etc. automatically)
      await prisma.user.delete({ where: { id: userId } });

      return res.status(200).json({ message: 'Account and all associated data deleted successfully' });
    } catch (error) {
      console.error('[ProfileController.deleteAccount] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
