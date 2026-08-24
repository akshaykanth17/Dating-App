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

  static async getBlockedUsers(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    
    try {
      const blocks = await prisma.block.findMany({
        where: { blockerId: userId },
        include: {
          blocked: {
            include: {
              profile: {
                include: {
                  photos: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const blockedUsers = blocks.map(block => {
        const p = block.blocked.profile;
        let primaryPhotoUrl = null;
        if (p?.photos && Array.isArray(p.photos) && p.photos.length > 0) {
          const photos = p.photos as any[];
          const primary = photos.find(ph => ph.isPrimary) || photos[0];
          primaryPhotoUrl = primary.url;
        }

        return {
          id: block.blocked.id,
          name: p?.name || 'Unknown User',
          photoUrl: primaryPhotoUrl,
          blockedAt: block.createdAt
        };
      });

      return res.status(200).json({ blockedUsers });
    } catch (error) {
      console.error('[SafetyController.getBlockedUsers] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async unblockUser(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const { blockedId } = req.params;

    if (!blockedId) {
      return res.status(400).json({ error: 'Blocked user ID is required' });
    }

    try {
      await prisma.block.delete({
        where: {
          blockerId_blockedId: {
            blockerId: userId,
            blockedId
          }
        }
      });
      return res.status(200).json({ message: 'User unblocked successfully' });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Block record not found' });
      }
      console.error('[SafetyController.unblockUser] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
