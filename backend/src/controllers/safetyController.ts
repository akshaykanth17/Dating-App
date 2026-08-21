import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

export class SafetyController {
  static async blockUser(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const { blockedId } = req.body;

    if (!blockedId) {
      return res.status(400).json({ error: 'User ID to block is required' });
    }

    if (userId === blockedId) {
      return res.status(400).json({ error: 'You cannot block yourself' });
    }

    try {
      // 1. Create block record
      await prisma.block.upsert({
        where: {
          blockerId_blockedId: {
            blockerId: userId,
            blockedId,
          },
        },
        create: {
          blockerId: userId,
          blockedId,
        },
        update: {}, // keep existing
      });

      // 2. Cascade delete matches between these two users (unmatch)
      await prisma.match.deleteMany({
        where: {
          OR: [
            { user1Id: userId, user2Id: blockedId },
            { user1Id: blockedId, user2Id: userId },
          ],
        },
      });

      // 3. Delete swaps between them so they don't swipe again
      await prisma.swipe.deleteMany({
        where: {
          OR: [
            { swiperId: userId, swipedId: blockedId },
            { swiperId: blockedId, swipedId: userId },
          ],
        },
      });

      return res.status(200).json({ message: 'User blocked and unmatched successfully' });
    } catch (error) {
      console.error('[SafetyController.blockUser] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async reportUser(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const { reportedId, reason, note } = req.body;

    if (!reportedId || !reason) {
      return res.status(400).json({ error: 'Reported user ID and reason are required' });
    }

    if (userId === reportedId) {
      return res.status(400).json({ error: 'You cannot report yourself' });
    }

    try {
      // 1. Create Report record
      const report = await prisma.report.create({
        data: {
          reporterId: userId,
          reportedId,
          reason,
          note,
        },
      });

      // 2. Automatically BLOCK the user as well for safety
      await prisma.block.upsert({
        where: {
          blockerId_blockedId: {
            blockerId: userId,
            blockedId: reportedId,
          },
        },
        create: {
          blockerId: userId,
          blockedId: reportedId,
        },
        update: {},
      });

      // 3. Delete match
      await prisma.match.deleteMany({
        where: {
          OR: [
            { user1Id: userId, user2Id: reportedId },
            { user1Id: reportedId, user2Id: userId },
          ],
        },
      });

      // 4. Delete swipes
      await prisma.swipe.deleteMany({
        where: {
          OR: [
            { swiperId: userId, swipedId: reportedId },
            { swiperId: reportedId, swipedId: userId },
          ],
        },
      });

      return res.status(201).json({
        message: 'User reported and blocked successfully',
        reportId: report.id,
      });
    } catch (error) {
      console.error('[SafetyController.reportUser] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
