import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

export class ChatController {
  static async getChatHistory(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const { matchId } = req.params;

    if (!matchId) {
      return res.status(400).json({ error: 'Match ID is required' });
    }

    try {
      // 1. Fetch match to verify user is a participant
      const match = await prisma.match.findUnique({
        where: { id: matchId },
      });

      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }

      if (match.user1Id !== userId && match.user2Id !== userId) {
        return res.status(403).json({ error: 'You are not authorized to view this chat history' });
      }

      // 2. Fetch messages
      const messages = await prisma.message.findMany({
        where: { matchId },
        orderBy: { createdAt: 'asc' },
      });

      return res.status(200).json(messages);
    } catch (error) {
      console.error('[ChatController.getChatHistory] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
