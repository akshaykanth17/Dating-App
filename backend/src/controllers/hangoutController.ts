import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

export class HangoutController {
  /**
   * Create a new Hangout event
   */
  static async createHangout(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const { title, location, eventDate } = req.body;

    if (!title || !location || !eventDate) {
      return res.status(400).json({ error: 'Title, location, and eventDate are required' });
    }

    try {
      const eventDateObj = new Date(eventDate);
      if (isNaN(eventDateObj.getTime())) {
        return res.status(400).json({ error: 'Invalid eventDate format' });
      }

      const hangout = await prisma.hangout.create({
        data: {
          creatorId: userId,
          title,
          location,
          eventDate: eventDateObj,
        },
        include: {
          creator: {
            include: {
              profile: {
                include: {
                  photos: true
                }
              }
            }
          }
        }
      });

      return res.status(201).json(hangout);
    } catch (error) {
      console.error('[HangoutController.createHangout] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get a feed of active Hangout events posted by others
   */
  static async getHangoutsFeed(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const gender = req.query.gender as string | undefined;
    const ageMin = req.query.ageMin ? parseInt(req.query.ageMin as string, 10) : undefined;
    const ageMax = req.query.ageMax ? parseInt(req.query.ageMax as string, 10) : undefined;
    const distanceFilter = req.query.distance ? parseInt(req.query.distance as string, 10) : undefined;

    try {
      // 1. Fetch current user's profile and blocks
      const swiperProfile = await prisma.profile.findUnique({
        where: { userId },
        include: { user: true },
      });

      const blocks = await prisma.block.findMany({
        where: {
          OR: [{ blockerId: userId }, { blockedId: userId }],
        },
      });
      const blockedIds = blocks.map((b) => (b.blockerId === userId ? b.blockedId : b.blockerId));

      let hangouts: any[] = [];
      const now = new Date();

      if (swiperProfile) {
        let finalInterests = swiperProfile.gendersInterestedIn;
        if (gender && gender !== 'all') {
          finalInterests = gender.split(',').filter(Boolean);
        }

        const finalAgeMin = ageMin ?? swiperProfile.ageInterestedInMin;
        const finalAgeMax = ageMax ?? swiperProfile.ageInterestedInMax;
        const finalDistance = distanceFilter ?? swiperProfile.distanceInterestedIn;

        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() - finalAgeMin);
        const minDate = new Date();
        minDate.setFullYear(minDate.getFullYear() - finalAgeMax - 1); // -1 to include the full year

        hangouts = await prisma.hangout.findMany({
          where: {
            creatorId: {
              not: userId,
              notIn: blockedIds,
            },
            eventDate: {
              gte: now,
            },
            creator: {
              email: {
                not: {
                  endsWith: '@demo.tapin.app',
                },
              },
              profile: {
                gender: { in: finalInterests },
                gendersInterestedIn: { has: swiperProfile.gender },
                birthdate: {
                  gte: minDate,
                  lte: maxDate
                }
              }
            }
          },
          include: {
            creator: {
              include: {
                profile: {
                  include: {
                    photos: {
                      orderBy: { isPrimary: 'desc' }
                    }
                  }
                }
              }
            }
          },
          orderBy: {
            eventDate: 'asc'
          },
          take: 100 // Fetch more initially to allow for in-memory distance filtering
        });

        // In-memory distance filtering
        if (finalDistance && swiperProfile.latitude && swiperProfile.longitude) {
          hangouts = hangouts.filter((h) => {
            const hLat = h.creator.profile?.latitude;
            const hLon = h.creator.profile?.longitude;
            if (!hLat || !hLon) return false;

            const lat1 = swiperProfile.latitude!;
            const lon1 = swiperProfile.longitude!;
            const lat2 = hLat;
            const lon2 = hLon;

            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                      Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const d = R * c;
            
            return d <= finalDistance;
          });
        }
        
        // Limit after distance filter
        hangouts = hangouts.slice(0, 30);
      }

      const formattedHangouts = hangouts.map((h) => {
        const eventDate = h.eventDate;

        return {
          id: h.id,
          title: h.title,
          location: h.location,
          eventDate: eventDate.toISOString(),
          createdAt: h.createdAt,
          creator: {
            id: h.creator.id,
            name: h.creator.profile?.name || 'Fellow Member',
            bio: h.creator.profile?.bio || 'Looking forward to meeting awesome people!',
            birthdate: h.creator.profile?.birthdate || new Date('2000-01-01'),
            gender: h.creator.profile?.gender || 'female',
            photos: h.creator.profile?.photos || [],
          }
        };
      });

      return res.status(200).json(formattedHangouts);
    } catch (error) {
      console.error('[HangoutController.getHangoutsFeed] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Like a hangout (Creates an instant Match)
   */
  static async likeHangout(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const { id } = req.params; // Hangout ID

    try {
      const hangout = await prisma.hangout.findUnique({
        where: { id },
      });

      if (!hangout) {
        return res.status(404).json({ error: 'Hangout not found' });
      }

      const targetUserId = hangout.creatorId;

      if (targetUserId === userId) {
        return res.status(400).json({ error: 'You cannot like your own hangout' });
      }

      // Option A: Instant Match
      // First, create the SWIPE LIKE records for both sides to reflect mutual interest
      await prisma.swipe.upsert({
        where: {
          swiperId_swipedId: { swiperId: userId, swipedId: targetUserId }
        },
        update: { type: 'LIKE' },
        create: { swiperId: userId, swipedId: targetUserId, type: 'LIKE' }
      });

      await prisma.swipe.upsert({
        where: {
          swiperId_swipedId: { swiperId: targetUserId, swipedId: userId }
        },
        update: { type: 'LIKE' },
        create: { swiperId: targetUserId, swipedId: userId, type: 'LIKE' }
      });

      // Then create the Match if it doesn't exist
      let match = await prisma.match.findFirst({
        where: {
          OR: [
            { user1Id: userId, user2Id: targetUserId },
            { user1Id: targetUserId, user2Id: userId },
          ],
          matchType: 'HANGOUT'
        }
      });

      if (!match) {
        match = await prisma.match.create({
          data: {
            user1Id: userId,
            user2Id: targetUserId,
            matchType: 'HANGOUT',
            hangoutId: hangout.id
          }
        });
      }

      // Add a system message or a message from the liker about the hangout
      await prisma.message.create({
        data: {
          matchId: match.id,
          senderId: userId,
          content: `I'd love to join you for your hangout: "${hangout.title}" at ${hangout.location}!`,
        }
      });

      return res.status(200).json({ 
        message: 'Hangout liked! It is now a match.',
        matchId: match.id
      });
    } catch (error) {
      console.error('[HangoutController.likeHangout] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
