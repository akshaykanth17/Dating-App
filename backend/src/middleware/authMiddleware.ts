import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Auth is bypassed: automatically act as the first seeded user
    const mockUser = await prisma.user.findFirst({
      where: { email: { endsWith: '@seed.heartsync.app' } },
    });

    if (!mockUser) {
      return res.status(401).json({ error: 'No seed users found in DB. Run seed script first.' });
    }

    req.userId = mockUser.id;
    next();
  } catch (error) {
    console.error('[authMiddleware] Error:', error);
    res.status(500).json({ error: 'Internal server error during mock auth' });
  }
}
