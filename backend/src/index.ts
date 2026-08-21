import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

// Load env variables
dotenv.config();

// Initialize Prisma
const prisma = new PrismaClient();

// Import Routes
import authRoutes from './routes/authRoutes';
import profileRoutes from './routes/profileRoutes';
import swipeRoutes from './routes/swipeRoutes';
import chatRoutes from './routes/chatRoutes';
import safetyRoutes from './routes/safetyRoutes';
import hangoutRoutes from './routes/hangoutRoutes';

// Import Services & Queue Workers
import { getQueueService } from './services/queueService';
import { emailService } from './services/emailService';

const app = express();
const server = http.createServer(app);

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve profile uploads statically
const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'uploads');
app.use('/uploads', express.static(uploadDir));

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/swipes', swipeRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/safety', safetyRoutes);
app.use('/api/hangouts', hangoutRoutes);

// Socket.IO Server configuration
const io = new Server(server, {
  cors: corsOptions,
});

// Expose io instance to express controllers
app.set('io', io);

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'heartsync_jwt_access_secret_change_me_in_production_12345';

// Socket.IO Authentication Middleware (Bypassed for demo)
io.use(async (socket, next) => {
  try {
    const mockUser = await prisma.user.findFirst({
      where: { email: { endsWith: '@seed.heartsync.app' } },
    });
    
    if (mockUser) {
      socket.data.userId = mockUser.id;
      next();
    } else {
      next(new Error('Authentication error: No seed users found'));
    }
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// Map to track active connections for online status check
const activeUsers = new Set<string>();

io.on('connection', (socket) => {
  const userId = socket.data.userId;
  activeUsers.add(userId);

  // Join a personal room named by userId for private real-time match alerts/push notes
  socket.join(userId);
  console.log(`[Socket] User ${userId} connected.`);

  // Broadcast presence status
  socket.broadcast.emit('online_status', { userId, status: 'online' });

  // Handle room joining (for active chat sessions)
  socket.on('join_room', async ({ matchId }) => {
    try {
      // Security Check: Verify user is part of the match
      const match = await prisma.match.findUnique({ where: { id: matchId } });
      if (match && (match.user1Id === userId || match.user2Id === userId)) {
        socket.join(`match_${matchId}`);
        console.log(`[Socket] User ${userId} joined room match_${matchId}`);
      }
    } catch (err) {
      console.error('[Socket] join_room error:', err);
    }
  });

  // Handle room leaving
  socket.on('leave_room', ({ matchId }) => {
    socket.leave(`match_${matchId}`);
    console.log(`[Socket] User ${userId} left room match_${matchId}`);
  });

  // Handle real-time chat messages
  socket.on('send_message', async ({ matchId, content }) => {
    if (!matchId || !content || content.trim() === '') return;

    try {
      // 1. Double check participant rights
      const match = await prisma.match.findUnique({
        where: { id: matchId },
      });

      if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
        return socket.emit('error', { message: 'Unauthorized message dispatch' });
      }

      // 2. Persist message to PostgreSQL
      const message = await prisma.message.create({
        data: {
          matchId,
          senderId: userId,
          content: content.trim(),
        },
      });

      // 3. Broadcast message to the room
      console.log(`[Socket] Broadcasting message to match_${matchId}:`, message.content);
      io.to(`match_${matchId}`).emit('receive_message', {
        id: message.id,
        matchId: message.matchId,
        senderId: message.senderId,
        content: message.content,
        createdAt: message.createdAt,
      });

      // 4. Also notify the other participant directly (e.g. to update active preview lists)
      const otherUserId = match.user1Id === userId ? match.user2Id : match.user1Id;
      io.to(otherUserId).emit('message_received', {
        matchId,
        lastMessage: {
          id: message.id,
          content: message.content,
          createdAt: message.createdAt,
        },
      });

      // --- AUTO-REPLY FOR DEMO PURPOSES ---
      // Simulates the other user typing and replying after a short delay
      setTimeout(() => {
        io.to(`match_${matchId}`).emit('typing', { senderId: otherUserId, isTyping: true });
        
        setTimeout(async () => {
          try {
            io.to(`match_${matchId}`).emit('typing', { senderId: otherUserId, isTyping: false });
            
            const replyMsg = await prisma.message.create({
              data: {
                matchId,
                senderId: otherUserId,
                content: `Haha, yeah! That's cool. Tell me more about it!`,
              }
            });

            io.to(`match_${matchId}`).emit('receive_message', {
              id: replyMsg.id,
              matchId: replyMsg.matchId,
              senderId: replyMsg.senderId,
              content: replyMsg.content,
              createdAt: replyMsg.createdAt,
            });

            io.to(userId).emit('message_received', {
              matchId,
              lastMessage: {
                id: replyMsg.id,
                content: replyMsg.content,
                createdAt: replyMsg.createdAt,
              },
            });
          } catch (e) {
            console.error('[Socket] Auto-reply error:', e);
          }
        }, 2000); // 2 seconds of typing
      }, 1000); // 1 second before they start typing

    } catch (error) {
      console.error('[Socket] send_message error:', error);
      socket.emit('error', { message: 'Failed to deliver message' });
    }
  });

  // Handle typing indicator
  socket.on('typing', ({ matchId, isTyping }) => {
    socket.to(`match_${matchId}`).emit('typing', { senderId: userId, isTyping });
  });

  // Check online status query
  socket.on('check_online', ({ targetUserId }, callback) => {
    if (callback && typeof callback === 'function') {
      callback({ isOnline: activeUsers.has(targetUserId) });
    }
  });

  socket.on('disconnect', () => {
    activeUsers.delete(userId);
    console.log(`[Socket] User ${userId} disconnected.`);
    // Broadcast status change
    socket.broadcast.emit('online_status', { userId, status: 'offline' });
  });
});

// Setup and start background queue services (Workers)
const queueService = getQueueService();

// Register Email Dispatch worker
queueService.registerWorker('email', async (jobData) => {
  const { email, token, type } = jobData;
  if (!email || !token) return;

  try {
    if (type === 'verification') {
      await emailService.sendVerificationEmail(email, token);
    } else if (type === 'reset') {
      await emailService.sendPasswordResetEmail(email, token);
    }
  } catch (error) {
    console.error(`[Worker] Failed to execute email job:`, error);
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`[Server] HeartSync API listening on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
});
