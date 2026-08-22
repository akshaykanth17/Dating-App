import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const prisma = new PrismaClient();
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'heartsync_jwt_access_secret_change_me_in_production_12345';

// Initialize Firebase Admin SDK (only once)
let adminApp: App;
if (getApps().length === 0) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    : null;

  if (serviceAccount) {
    adminApp = initializeApp({ credential: cert(serviceAccount) });
  } else {
    adminApp = initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'heartsync-placeholder' });
  }
} else {
  adminApp = getApps()[0];
}

function generateAccessToken(userId: string) {
  return jwt.sign({ userId }, ACCESS_TOKEN_SECRET, { expiresIn: '7d' });
}

export class FirebaseAuthController {
  /**
   * POST /api/auth/firebase
   * Verifies a Firebase ID token from the frontend and issues our own JWT.
   * Creates a new user in the DB if one doesn't exist.
   */
  static async authenticateWithFirebase(req: Request, res: Response) {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'Firebase ID token is required' });
    }

    try {
      // 1. Verify the token with Firebase Admin SDK
      const decodedToken = await getAuth(adminApp).verifyIdToken(idToken);
      const { uid, email, name, picture } = decodedToken;

      if (!email) {
        return res.status(400).json({ error: 'Email is required from Firebase token' });
      }

      // 2. Find or create the user in our DB
      let user = await prisma.user.findFirst({
        where: {
          OR: [{ firebaseUid: uid }, { email }],
        },
        include: {
          profile: {
            include: { photos: true }
          }
        }
      });

      const isNewUser = !user;

      if (!user) {
        // New user — create account (no profile yet, isOnboarded: false)
        user = await prisma.user.create({
          data: {
            email,
            firebaseUid: uid,
            authProvider: 'google',
            isVerified: true,
            isOnboarded: false,
          },
          include: {
            profile: {
              include: { photos: true }
            }
          }
        });
      } else if (!user.firebaseUid) {
        // Existing email user signing in with Google — link accounts
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            firebaseUid: uid,
            authProvider: 'google',
            isVerified: true,
          },
          include: {
            profile: {
              include: { photos: true }
            }
          }
        });
      }

      // 3. Issue our own JWT
      const accessToken = generateAccessToken(user.id);

      return res.status(200).json({
        accessToken,
        isOnboarded: user.isOnboarded,
        isNewUser,
        user: {
          id: user.id,
          email: user.email,
          isVerified: user.isVerified,
          isOnboarded: user.isOnboarded,
          authProvider: user.authProvider,
          profile: user.profile,
        },
      });
    } catch (error: any) {
      console.error('[FirebaseAuthController] Error:', error.message);
      if (error.code === 'auth/id-token-expired') {
        return res.status(401).json({ error: 'Firebase token expired. Please sign in again.' });
      }
      return res.status(401).json({ error: 'Invalid Firebase token' });
    }
  }
}
