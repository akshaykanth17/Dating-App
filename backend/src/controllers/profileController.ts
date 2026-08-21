import { Response } from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { getStorageService } from '../services/storageService';

const prisma = new PrismaClient();
const storageService = getStorageService();

export class ProfileController {
  static async getMyProfile(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;

    try {
      const profile = await prisma.profile.findUnique({
        where: { userId },
        include: { photos: true },
      });

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      return res.status(200).json(profile);
    } catch (error) {
      console.error('[ProfileController.getMyProfile] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const { name, bio, gender, birthdate, latitude, longitude, ageInterestedInMin, ageInterestedInMax, distanceInterestedIn, gendersInterestedIn } = req.body;

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

      const updatedProfile = await prisma.profile.update({
        where: { userId },
        data: updateData,
        include: { photos: true },
      });

      return res.status(200).json(updatedProfile);
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
