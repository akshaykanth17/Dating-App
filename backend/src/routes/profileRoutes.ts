import { Router } from 'express';
import multer from 'multer';
import { ProfileController } from '../controllers/profileController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
});

// Protect all profile routes
router.use(authMiddleware);

router.get('/me', ProfileController.getMyProfile);
router.put('/me', ProfileController.updateProfile);
router.put('/me/change-password', ProfileController.changePassword);
router.delete('/me/delete-account', ProfileController.deleteAccount);
router.post('/me/photos', upload.single('photo'), ProfileController.uploadPhoto);
router.delete('/me/photos/:photoId', ProfileController.deletePhoto);
router.put('/me/photos/:photoId/primary', ProfileController.setPrimaryPhoto);

export default router;
