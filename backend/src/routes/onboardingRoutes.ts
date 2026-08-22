import { Router } from 'express';
import { FirebaseAuthController } from '../controllers/firebaseAuthController';
import { OnboardingController } from '../controllers/onboardingController';
import { authMiddleware } from '../middleware/authMiddleware';
import multer from 'multer';
import path from 'path';
import { ProfileController } from '../controllers/profileController';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// Firebase auth (Google + Email sign-in from frontend)
router.post('/firebase', FirebaseAuthController.authenticateWithFirebase);

// Onboarding routes (require auth token but not isOnboarded)
router.post('/profile', authMiddleware, OnboardingController.saveProfile);
router.post('/photo', authMiddleware, upload.single('photo'), ProfileController.uploadPhoto);
router.post('/complete', authMiddleware, OnboardingController.completeOnboarding);

export default router;
