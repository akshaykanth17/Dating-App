import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { DiscoveryService } from '../services/discoveryService';

const prisma = new PrismaClient();

export class SwipeController {
  static async getDiscoveryFeed(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const gender = req.query.gender as string | undefined;
    const ageMin = req.query.ageMin ? parseInt(req.query.ageMin as string, 10) : undefined;
    const ageMax = req.query.ageMax ? parseInt(req.query.ageMax as string, 10) : undefined;
    const distance = req.query.distance ? parseInt(req.query.distance as string, 10) : undefined;

    try {
      const candidates = await DiscoveryService.getCandidates(userId, limit, gender, ageMin, ageMax, distance);
      return res.status(200).json(candidates);
    } catch (error) {
      console.error('[SwipeController.getDiscoveryFeed] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async swipe(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    let { swipedId, type } = req.body; // type: "LIKE", "PASS", or "SUPER_LIKE"

    if (type === 'SUPER') type = 'SUPER_LIKE';

    if (!swipedId || !type || !['LIKE', 'PASS', 'SUPER_LIKE'].includes(type)) {
      return res.status(400).json({ error: 'Valid swipedId and type (LIKE/PASS/SUPER_LIKE) are required' });
    }

    if (userId === swipedId) {
      return res.status(400).json({ error: 'You cannot swipe on yourself' });
    }

    try {
      // 1. Verify target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: swipedId },
        include: { profile: true },
      });

      if (!targetUser || !targetUser.profile) {
        return res.status(404).json({ error: 'Target user profile not found' });
      }

      // 1b. If Super Like, verify 1 daily limit (resets daily at midnight)
      if (type === 'SUPER_LIKE') {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const superLikesToday = await prisma.swipe.count({
          where: {
            swiperId: userId,
            type: 'SUPER_LIKE',
            createdAt: { gte: startOfDay },
          },
        });

        if (superLikesToday >= 1) {
          return res.status(400).json({ 
            error: 'You have used your 1 free daily Super Like. Log in tomorrow to claim another free Super Like!' 
          });
        }
      }

      // 2. Record the swipe
      await prisma.swipe.upsert({
        where: {
          swiperId_swipedId: {
            swiperId: userId,
            swipedId,
          },
        },
        create: {
          swiperId: userId,
          swipedId,
          type,
        },
        update: {
          type,
          createdAt: new Date(), // update swipe timestamp
        },
      });

      // 3. Check for mutual match if the swipe is a LIKE or SUPER_LIKE
      if (type === 'LIKE' || type === 'SUPER_LIKE') {
        let isMatch = false;

        const mutualSwipe = await prisma.swipe.findUnique({
          where: {
            swiperId_swipedId: {
              swiperId: swipedId,
              swipedId: userId,
            },
          },
        });

        if (mutualSwipe && (mutualSwipe.type === 'LIKE' || mutualSwipe.type === 'SUPER_LIKE')) {
          isMatch = true;
        }

        if (isMatch) {
          // It's a match! Store match in lexicographical order to prevent duplicates
          const user1Id = userId < swipedId ? userId : swipedId;
          const user2Id = userId < swipedId ? swipedId : userId;

          const match = await prisma.match.upsert({
            where: {
              user1Id_user2Id_matchType: { user1Id, user2Id, matchType: 'DATING' },
            },
            create: { user1Id, user2Id, matchType: 'DATING' },
            update: {}, // keep existing if already created somehow
          });

          // Fetch profiles to send with notifications
          const profiles = await prisma.profile.findMany({
            where: { userId: { in: [user1Id, user2Id] } },
            include: { photos: true },
          });

          const profile1 = profiles.find((p) => p.userId === user1Id);
          const profile2 = profiles.find((p) => p.userId === user2Id);

          // Notify users via Socket.IO
          const io = req.app.get('io');
          if (io) {
            // Send payload to User 1
            io.to(user1Id).emit('new_match', {
              matchId: match.id,
              otherProfile: profile2 ? {
                id: profile2.id,
                userId: profile2.userId,
                name: profile2.name,
                photos: profile2.photos,
              } : null,
            });

            // Send payload to User 2
            io.to(swipedId).emit('new_match', {
              matchId: match.id,
              otherProfile: profile1 ? {
                id: profile1.id,
                userId: profile1.userId,
                name: profile1.name,
                photos: profile1.photos,
              } : null,
            });
          }

          return res.status(200).json({
            isMatch: true,
            matchId: match.id,
            otherProfile: userId === user1Id ? profile2 : profile1,
          });
        }
      }

      return res.status(200).json({ isMatch: false });
    } catch (error) {
      console.error('[SwipeController.swipe] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getMatches(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;

    try {
      // Find matches where user is user1 or user2
      const matches = await prisma.match.findMany({
        where: {
          OR: [
            { user1Id: userId },
            { user2Id: userId },
          ],
        },
        include: {
          hangout: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (matches.length === 0) {
        return res.status(200).json([]);
      }

      // Extract details
      const matchDTOs = await Promise.all(
        matches.map(async (m) => {
          const otherUserId = m.user1Id === userId ? m.user2Id : m.user1Id;

          // Fetch other user profile
          const otherProfile = await prisma.profile.findUnique({
            where: { userId: otherUserId },
            include: { photos: true },
          });

          // Fetch last message
          const lastMessage = await prisma.message.findFirst({
            where: { matchId: m.id },
            orderBy: { createdAt: 'desc' },
          });

          return {
            id: m.id,
            user1Id: m.user1Id,
            user2Id: m.user2Id,
            matchType: m.matchType,
            user1Continue: m.user1Continue,
            user2Continue: m.user2Continue,
            hangoutEventDate: m.hangout?.eventDate || null,
            otherProfile: otherProfile ? {
              id: otherProfile.id,
              userId: otherProfile.userId,
              name: otherProfile.name,
              photos: otherProfile.photos,
              bio: otherProfile.bio,
              gender: otherProfile.gender,
            } : null,
            lastMessage: lastMessage ? {
              id: lastMessage.id,
              matchId: lastMessage.matchId,
              senderId: lastMessage.senderId,
              content: lastMessage.content,
              createdAt: lastMessage.createdAt,
            } : null,
            createdAt: m.createdAt,
          };
        })
      );

      return res.status(200).json(matchDTOs);
    } catch (error) {
      console.error('[SwipeController.getMatches] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async continueMatch(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const { id } = req.params;

    try {
      const match = await prisma.match.findUnique({ where: { id } });
      if (!match) return res.status(404).json({ error: 'Match not found' });

      if (match.user1Id !== userId && match.user2Id !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const isUser1 = match.user1Id === userId;
      
      const updatedMatch = await prisma.match.update({
        where: { id },
        data: isUser1 ? { user1Continue: true } : { user2Continue: true }
      });

      // If both have continued, upgrade to DATING
      if (updatedMatch.user1Continue && updatedMatch.user2Continue) {
        await prisma.match.update({
          where: { id },
          data: { matchType: 'DATING' }
        });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('[SwipeController.continueMatch] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async unmatch(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const { id } = req.params;

    try {
      const match = await prisma.match.findUnique({ where: { id } });
      if (!match) return res.status(404).json({ error: 'Match not found' });

      if (match.user1Id !== userId && match.user2Id !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await prisma.match.delete({ where: { id } });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('[SwipeController.unmatch] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getSuperLikeStatus(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const superLikesToday = await prisma.swipe.count({
        where: {
          swiperId: userId,
          type: 'SUPER_LIKE',
          createdAt: { gte: startOfDay },
        },
      });

      const remaining = Math.max(0, 1 - superLikesToday);
      return res.status(200).json({
        dailyLimit: 1,
        remaining,
        usedToday: superLikesToday >= 1,
      });
    } catch (error) {
      console.error('[SwipeController.getSuperLikeStatus] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async resetSwipes(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    try {
      await prisma.swipe.deleteMany({
        where: { swiperId: userId }
      });
      return res.status(200).json({ success: true, message: 'Swipes reset successfully' });
    } catch (error) {
      console.error('[SwipeController.resetSwipes] Error:', error);
      return res.status(500).json({ error: 'Failed to reset swipes' });
    }
  }

  static async undoSwipe(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    try {
      const lastSwipe = await prisma.swipe.findFirst({
        where: { swiperId: userId },
        orderBy: { createdAt: 'desc' },
      });

      if (!lastSwipe) {
        return res.status(404).json({ error: 'No previous swipe found to undo' });
      }

      await prisma.swipe.delete({
        where: { id: lastSwipe.id }
      });

      return res.status(200).json({ success: true, undoneSwipedId: lastSwipe.swipedId });
    } catch (error) {
      console.error('[SwipeController.undoSwipe] Error:', error);
      return res.status(500).json({ error: 'Failed to undo swipe' });
    }
  }
}
