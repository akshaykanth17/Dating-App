import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const router = Router();
const prisma = new PrismaClient();

const SEED_SECRET = process.env.SEED_SECRET || 'heartsync-seed-2026';

const firstNames = ['Arjun', 'Sanya', 'Rohan', 'Meera', 'Vikram', 'Ananya', 'Kavya', 'Rishabh', 'Tara', 'Aditya', 'Ishaan', 'Diya'];
const photos = [
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517365830460-955ce3ccd263?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80',
];

const hangoutIdeas = [
  { title: 'Coffee at Starbucks', location: 'Starbucks Palakkad', hoursOffset: 24 },
  { title: 'Evening Walk in the Park', location: 'Malampuzha Gardens', hoursOffset: 48 },
  { title: 'Movie Night', location: 'Priya Theatre', hoursOffset: 12 },
  { title: 'Trying out the new Cafe', location: 'Downtown Cafe', hoursOffset: 72 },
  { title: 'Weekend Hiking Trip', location: 'Nelliyampathy', hoursOffset: 96 },
  { title: 'Local Art Exhibition', location: 'Rappadi Art Hall', hoursOffset: 36 },
  { title: 'Food Truck Festival', location: 'Stadium Stand', hoursOffset: 60 },
  { title: 'Gaming Lounge Session', location: 'Cyber Hub', hoursOffset: 14 },
  { title: 'Book Store Browsing', location: 'DC Books', hoursOffset: 84 },
  { title: 'Brunch Date', location: 'Noorjehan Cafe', hoursOffset: 20 },
  { title: 'Sunset Photography Walk', location: 'Palakkad Fort', hoursOffset: 30 },
  { title: 'Badminton Evening', location: 'Sports Complex', hoursOffset: 18 },
];

// GET /api/seed?secret=<SEED_SECRET>
router.get('/', async (req: Request, res: Response) => {
  const secret = req.query.secret as string;

  if (secret !== SEED_SECRET) {
    return res.status(401).json({ error: 'Unauthorized. Provide correct seed secret.' });
  }

  const results: string[] = [];

  try {
    const timestamp = Date.now();
    const createdUsers: { id: string; email: string }[] = [];

    for (let i = 0; i < 12; i++) {
      const isFemale = i % 2 === 0;
      const name = firstNames[i];

      // Slight random offset around Palakkad coordinates (10.67, 76.60)
      const latOffset = (Math.random() - 0.5) * 0.1;
      const lngOffset = (Math.random() - 0.5) * 0.1;

      const email = `dummy_live_${name.toLowerCase()}_${timestamp}_${i}@example.com`;

      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('dummypassword123', salt);

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: hash,
          isVerified: true,
          isOnboarded: true,
          profile: {
            create: {
              name,
              birthdate: new Date(`199${Math.floor(Math.random() * 9)}-0${Math.floor(Math.random() * 8) + 1}-15`),
              gender: isFemale ? 'female' : 'male',
              bio: `Hey there! I'm ${name}, a real person looking for genuine connections. I love exploring new places, trying new cuisines, and having great conversations! 😊`,
              latitude: 10.67 + latOffset,
              longitude: 76.60 + lngOffset,
              interests: ['Coffee', 'Travel', 'Music', 'Books', 'Fitness'].slice(0, 3 + (i % 3)),
              job: ['Software Engineer', 'Doctor', 'Teacher', 'Designer', 'Entrepreneur', 'Chef'][i % 6],
              education: ['IIT Madras', 'NIT Calicut', 'Kerala University', 'BITS Pilani', 'Anna University', 'MG University'][i % 6],
              drinking: ['Never', 'Socially', 'Rarely'][i % 3],
              smoking: ['Never', 'Rarely'][i % 2],
              gym: ['Daily', 'Often', 'Sometimes', 'Rarely'][i % 4],
              height: 155 + Math.floor(Math.random() * 30),
              weight: 50 + Math.floor(Math.random() * 30),
              favoriteSpot: ['Malampuzha Gardens', 'Palakkad Fort', 'Silent Valley', 'Nelliyampathy Hills'][i % 4],
              gendersInterestedIn: ['male', 'female'],
              photos: {
                create: [
                  { url: photos[i], isPrimary: true },
                  { url: photos[(i + 1) % photos.length], isPrimary: false },
                ],
              },
              prompts: {
                create: [
                  {
                    question: 'I geek out on...',
                    answer: ['Astrophysics and sci-fi movies', 'Kerala cuisine and cooking', 'Trekking routes in the Western Ghats', 'Photography and visual storytelling'][i % 4],
                  },
                  {
                    question: 'A perfect Sunday looks like...',
                    answer: ['Hiking followed by a long brunch', 'Reading at a cozy cafe with good music', 'Exploring a new part of the city', 'Cooking a big meal for friends'][i % 4],
                  },
                ],
              },
            },
          },
        },
      });

      createdUsers.push({ id: user.id, email });
      results.push(`✅ Created user: ${email}`);
    }

    // Create hangouts for the first 10 users
    for (let i = 0; i < Math.min(createdUsers.length, hangoutIdeas.length); i++) {
      const idea = hangoutIdeas[i];
      await prisma.hangout.create({
        data: {
          title: idea.title,
          location: idea.location,
          eventDate: new Date(Date.now() + idea.hoursOffset * 60 * 60 * 1000),
          creatorId: createdUsers[i].id,
        },
      });
      results.push(`🎉 Created hangout: "${idea.title}" for ${createdUsers[i].email}`);
    }

    return res.status(200).json({
      success: true,
      message: `Seeded ${createdUsers.length} profiles and ${Math.min(createdUsers.length, hangoutIdeas.length)} hangouts`,
      details: results,
    });
  } catch (error: any) {
    console.error('[SeedRoute] Error:', error);
    return res.status(500).json({ error: error.message || 'Seed failed' });
  }
});

export default router;
