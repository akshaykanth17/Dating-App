import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { cleanAllDummyData } from '../services/seedService';

const router = Router();
const prisma = new PrismaClient();

const SEED_SECRET = process.env.SEED_SECRET || 'heartsync-seed-2026';

// GET & POST /api/seed/clean or /api/seed
router.all('/clean', async (req: Request, res: Response) => {
  const secret = (req.query.secret || req.body?.secret) as string;

  if (process.env.NODE_ENV === 'production' && secret !== SEED_SECRET) {
    return res.status(401).json({ error: 'Unauthorized. Provide correct seed secret (?secret=heartsync-seed-2026).' });
  }

  try {
    const result = await cleanAllDummyData(prisma);
    const profileCount = await prisma.profile.count();
    const hangoutCount = await prisma.hangout.count();

    return res.status(200).json({
      success: true,
      message: `Cleaned ${result.deletedUsers} demo users and ${result.deletedHangouts} demo hangouts. Remaining profiles: ${profileCount}, Remaining hangouts: ${hangoutCount}`,
      ...result,
      profileCount,
      hangoutCount
    });
  } catch (error: any) {
    console.error('[SeedRoute.clean] Error:', error);
    return res.status(500).json({ error: error.message || 'Clean failed' });
  }
});

router.all('/', async (req: Request, res: Response) => {
  try {
    const result = await cleanAllDummyData(prisma);
    const profileCount = await prisma.profile.count();
    const hangoutCount = await prisma.hangout.count();

    return res.status(200).json({
      success: true,
      message: `Cleaned demo data. Remaining profiles: ${profileCount}, Remaining hangouts: ${hangoutCount}`,
      ...result,
      profileCount,
      hangoutCount
    });
  } catch (error: any) {
    console.error('[SeedRoute] Error:', error);
    return res.status(500).json({ error: error.message || 'Clean failed' });
  }
});

export default router;
