import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

export interface DummyProfileDef {
  name: string;
  email: string;
  age: number;
  gender: 'female' | 'male';
  bio: string;
  job: string;
  education: string;
  interests: string[];
  favoriteSpot: string;
  drinking: string;
  smoking: string;
  gym: string;
  height: number;
  weight: number;
  photos: string[];
  prompts: { question: string; answer: string }[];
}

export const DUMMY_PROFILES: DummyProfileDef[] = [
  {
    name: 'Priya Sharma',
    email: 'priya.sharma@demo.tapin.app',
    age: 24,
    gender: 'female',
    bio: 'Product designer with a penchant for specialty pour-overs, indie gigs, and impulsive weekend road trips. Let’s find the best cheesecake in town!',
    job: 'Product Designer',
    education: 'National Institute of Design',
    interests: ['Coffee', 'Design', 'Indie Rock', 'Travel', 'Art'],
    favoriteSpot: 'Third Wave Coffee Roasters',
    drinking: 'Socially',
    smoking: 'Never',
    gym: 'Often',
    height: 165,
    weight: 54,
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=800',
    ],
    prompts: [
      { question: 'A perfect Sunday looks like...', answer: 'A slow morning espresso, farmer market stroll, and sketching at the botanical gardens.' },
      { question: 'I geek out on...', answer: 'Micro-interactions, typography pairings, and 90s anime soundtracks.' }
    ]
  },
  {
    name: 'Rahul Menon',
    email: 'rahul.menon@demo.tapin.app',
    age: 26,
    gender: 'male',
    bio: 'Software engineer by day, amateur chef by night. Training for my second half-marathon. Always down for good banter and vinyl listening sessions.',
    job: 'Senior Software Engineer',
    education: 'IIT Madras',
    interests: ['Running', 'Cooking', 'Tech', 'Vinyls', 'Hiking'],
    favoriteSpot: 'Lakeside Running Trail',
    drinking: 'Socially',
    smoking: 'Never',
    gym: 'Daily',
    height: 180,
    weight: 75,
    photos: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=800',
    ],
    prompts: [
      { question: 'First round is on me if...', answer: 'You can guess my signature homemade pasta recipe on the first try.' },
      { question: 'I will never shut up about...', answer: 'The beauty of clean distributed systems and 70s rock.' }
    ]
  },
  {
    name: 'Ananya Roy',
    email: 'ananya.roy@demo.tapin.app',
    age: 23,
    gender: 'female',
    bio: 'Art director & film photographer. Capturing golden hours and collecting vintage postcards. Teach me something new and I’ll bake you cinnamon rolls!',
    job: 'Creative Art Director',
    education: 'Srishti Institute of Art',
    interests: ['Photography', 'Baking', 'Museums', 'Cinema', 'Pottery'],
    favoriteSpot: 'Heritage Art Gallery',
    drinking: 'Rarely',
    smoking: 'Never',
    gym: 'Sometimes',
    height: 162,
    weight: 52,
    photos: [
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&q=80&w=800',
    ],
    prompts: [
      { question: 'My simple pleasures...', answer: '35mm film developing scents, fresh rain on cobblestone, and warm chai.' },
      { question: 'Two truths and a lie...', answer: 'I lived in Kyoto, I’ve never seen Star Wars, I can juggle while riding a unicycle.' }
    ]
  },
  {
    name: 'Vikramaditya V',
    email: 'vikram.v@demo.tapin.app',
    age: 27,
    gender: 'male',
    bio: 'Product manager, summit chaser, and proud dog dad to a golden retriever named Milo. Looking for someone to share camping stories and rooftop dinners with.',
    job: 'Product Manager',
    education: 'BITS Pilani',
    interests: ['Trekking', 'Dogs', 'Board Games', 'Live Music', 'Reading'],
    favoriteSpot: 'Sunset Peak Overlook',
    drinking: 'Socially',
    smoking: 'Never',
    gym: 'Often',
    height: 183,
    weight: 78,
    photos: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800',
    ],
    prompts: [
      { question: 'The quickest way to my heart...', answer: 'Being nice to dogs and appreciating spicy street tacos.' },
      { question: 'I geek out on...', answer: 'Topographic maps, space exploration history, and craft coffee.' }
    ]
  },
  {
    name: 'Sneha Patel',
    email: 'sneha.patel@demo.tapin.app',
    age: 25,
    gender: 'female',
    bio: 'Neuroscience researcher fascinated by brain plasticity and psychology. Also a classical Bharatnatyam dancer and passionate foodie.',
    job: 'Neuroscience Researcher',
    education: 'IISc Bangalore',
    interests: ['Dance', 'Science', 'Foodie', 'Podcasts', 'Yoga'],
    favoriteSpot: 'Botanical Glasshouse Cafe',
    drinking: 'Never',
    smoking: 'Never',
    gym: 'Often',
    height: 168,
    weight: 56,
    photos: [
      'https://images.unsplash.com/photo-1517365830460-955ce3ccd263?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=800',
    ],
    prompts: [
      { question: 'I’m looking for...', answer: 'Someone with genuine curiosity, emotional maturity, and an infectious laugh.' },
      { question: 'A life goal of mine...', answer: 'Publish a book bridging modern neurobiology and classical arts.' }
    ]
  },
  {
    name: 'Kabir Das',
    email: 'kabir.das@demo.tapin.app',
    age: 28,
    gender: 'male',
    bio: 'Commercial pilot and adventure photographer. 42 countries explored and counting. Back in town looking for spontaneous sunset chases and live jazz.',
    job: 'Aviation Pilot',
    education: 'Indira Gandhi Rashtriya Uran Akademi',
    interests: ['Aviation', 'Travel', 'Jazz', 'Scuba', 'Fitness'],
    favoriteSpot: 'Hangar Lounge Rooftop',
    drinking: 'Socially',
    smoking: 'Never',
    gym: 'Daily',
    height: 185,
    weight: 80,
    photos: [
      'https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=800',
    ],
    prompts: [
      { question: 'Best travel story...', answer: 'Landing a Cessna on a remote coastal runway just in time to catch a bioluminescent tide.' },
      { question: 'Together we could...', answer: 'Take a spontaneous weekend flight to anywhere with warm beaches.' }
    ]
  },
  {
    name: 'Diya Nair',
    email: 'diya.nair@demo.tapin.app',
    age: 24,
    gender: 'female',
    bio: 'Sustainable architect designing green urban spaces. Plant mom to 23 succulents. I love flea market hunting, pottery workshops, and matcha lattes!',
    job: 'Sustainable Architect',
    education: 'CEPT University',
    interests: ['Architecture', 'Plants', 'Thrifting', 'Matcha', 'Cycling'],
    favoriteSpot: 'The Greenhouse Cafe',
    drinking: 'Socially',
    smoking: 'Never',
    gym: 'Sometimes',
    height: 163,
    weight: 53,
    photos: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800',
    ],
    prompts: [
      { question: 'I geek out on...', answer: 'Biophilic design, rooftop hydroponics, and handmade ceramic mugs.' },
      { question: 'Dating me means...', answer: 'You’ll always have someone to test out new dessert places with.' }
    ]
  },
  {
    name: 'Rohan Kapoor',
    email: 'rohan.kapoor@demo.tapin.app',
    age: 27,
    gender: 'male',
    bio: 'AI researcher & founder. Passionate about badminton, acoustic guitar, and late-night philosophical conversations over hot chocolate.',
    job: 'AI Research Lead',
    education: 'IIT Delhi',
    interests: ['Badminton', 'Guitar', 'Philosophy', 'Sci-Fi', 'AI'],
    favoriteSpot: 'Smash Sports Arena',
    drinking: 'Rarely',
    smoking: 'Never',
    gym: 'Often',
    height: 178,
    weight: 72,
    photos: [
      'https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=800',
    ],
    prompts: [
      { question: 'My love language is...', answer: 'Making a custom playlist for every mood and sending random interesting articles.' },
      { question: 'I’m convinced that...', answer: 'The best ideas come during midnight walks in quiet neighborhoods.' }
    ]
  }
];

export const DUMMY_HANGOUTS = [
  {
    title: 'Specialty Coffee & Concept Sketching',
    location: 'Third Wave Coffee / Downtown Cafe',
    hoursOffset: 24, // tomorrow
    creatorEmail: 'priya.sharma@demo.tapin.app',
  },
  {
    title: 'Interstellar IMAX Screening & Pizza',
    location: 'PVR IMAX / Central Mall',
    hoursOffset: 36,
    creatorEmail: 'rahul.menon@demo.tapin.app',
  },
  {
    title: 'Sunset Film Photography Walk',
    location: 'Heritage Fort & Lake Viewpoint',
    hoursOffset: 48,
    creatorEmail: 'ananya.roy@demo.tapin.app',
  },
  {
    title: 'Saturday Morning Ridge Hike & Breakfast',
    location: 'Nelliyampathy Hill Trails',
    hoursOffset: 72,
    creatorEmail: 'vikram.v@demo.tapin.app',
  },
  {
    title: 'Board Games & Artisanal Kombucha Night',
    location: 'Dice & Brew Social Lounge',
    hoursOffset: 60,
    creatorEmail: 'sneha.patel@demo.tapin.app',
  },
  {
    title: 'Live Sunset Jazz & Rooftop Mocktails',
    location: 'Skyline Terrace Lounge',
    hoursOffset: 84,
    creatorEmail: 'kabir.das@demo.tapin.app',
  },
  {
    title: 'Succulent Pottery Workshop & Matcha',
    location: 'Clay Studio & Greenhouse',
    hoursOffset: 96,
    creatorEmail: 'diya.nair@demo.tapin.app',
  },
  {
    title: 'Evening Badminton & Smoothie Run',
    location: 'Smash Sports Arena',
    hoursOffset: 30,
    creatorEmail: 'rohan.kapoor@demo.tapin.app',
  }
];

export async function seedDummyDataIfEmpty(prisma: PrismaClient) {
  try {
    const existingCount = await prisma.user.count({
      where: { email: { contains: '@demo.tapin.app' } }
    });

    if (existingCount >= 6) {
      // Ensure hangouts dates stay fresh in the future
      const now = new Date();
      await prisma.hangout.updateMany({
        where: { eventDate: { lt: now } },
        data: {
          eventDate: new Date(Date.now() + 48 * 60 * 60 * 1000)
        }
      });
      return;
    }

    console.log('[SeedService] Seeding rich demo profiles & hangouts...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('DemoPassword123!', salt);

    const createdUsers: Record<string, string> = {};

    for (let i = 0; i < DUMMY_PROFILES.length; i++) {
      const p = DUMMY_PROFILES[i];
      const birthYear = new Date().getFullYear() - p.age;
      const birthdate = new Date(`${birthYear}-05-15`);

      const latOffset = (Math.random() - 0.5) * 0.05;
      const lngOffset = (Math.random() - 0.5) * 0.05;

      const user = await prisma.user.upsert({
        where: { email: p.email },
        update: {},
        create: {
          email: p.email,
          passwordHash,
          isVerified: true,
          isOnboarded: true,
          authProvider: 'email',
          profile: {
            create: {
              name: p.name,
              birthdate,
              gender: p.gender,
              bio: p.bio,
              latitude: 10.67 + latOffset,
              longitude: 76.60 + lngOffset,
              interests: p.interests,
              job: p.job,
              education: p.education,
              drinking: p.drinking,
              smoking: p.smoking,
              gym: p.gym,
              height: p.height,
              weight: p.weight,
              favoriteSpot: p.favoriteSpot,
              ageInterestedInMin: 18,
              ageInterestedInMax: 45,
              distanceInterestedIn: 100,
              gendersInterestedIn: ['female', 'male'],
              photos: {
                create: p.photos.map((url, idx) => ({
                  url,
                  isPrimary: idx === 0,
                }))
              },
              prompts: {
                create: p.prompts.map(prompt => ({
                  question: prompt.question,
                  answer: prompt.answer,
                }))
              }
            }
          }
        },
        include: { profile: true }
      });

      createdUsers[p.email] = user.id;
    }

    // Seed Hangouts
    for (const h of DUMMY_HANGOUTS) {
      const creatorId = createdUsers[h.creatorEmail];
      if (!creatorId) continue;

      const eventDate = new Date(Date.now() + h.hoursOffset * 60 * 60 * 1000);

      const existingHangout = await prisma.hangout.findFirst({
        where: { title: h.title, creatorId }
      });

      if (!existingHangout) {
        await prisma.hangout.create({
          data: {
            title: h.title,
            location: h.location,
            eventDate,
            creatorId
          }
        });
      } else {
        await prisma.hangout.update({
          where: { id: existingHangout.id },
          data: { eventDate }
        });
      }
    }

    console.log('[SeedService] Dummy profiles and hangouts successfully populated.');
  } catch (error) {
    console.error('[SeedService] Seeding error:', error);
  }
}

export async function cleanAllDummyData(prisma: PrismaClient): Promise<{ deletedUsers: number; deletedHangouts: number }> {
  try {
    console.log('[SeedService] Cleaning all demo profiles and demo hangouts from live database...');

    // 1. Find all demo user IDs
    const demoUsers = await prisma.user.findMany({
      where: {
        OR: [
          { email: { endsWith: '@demo.tapin.app' } },
          { email: { endsWith: '@seed.tapin.app' } },
        ]
      },
      select: { id: true }
    });

    const demoUserIds = demoUsers.map(u => u.id);

    // 2. Delete Hangouts created by demo users or matching dummy hangout titles
    const dummyTitles = DUMMY_HANGOUTS.map(h => h.title);
    const deletedHangoutsResult = await prisma.hangout.deleteMany({
      where: {
        OR: [
          { creatorId: { in: demoUserIds } },
          { title: { in: dummyTitles } }
        ]
      }
    });

    if (demoUserIds.length > 0) {
      // 3. Delete messages involving demo users
      await prisma.message.deleteMany({
        where: {
          senderId: { in: demoUserIds }
        }
      });

      // 4. Delete matches involving demo users
      await prisma.match.deleteMany({
        where: {
          OR: [
            { user1Id: { in: demoUserIds } },
            { user2Id: { in: demoUserIds } }
          ]
        }
      });

      // 5. Delete swipes involving demo users
      await prisma.swipe.deleteMany({
        where: {
          OR: [
            { swiperId: { in: demoUserIds } },
            { swipedId: { in: demoUserIds } }
          ]
        }
      });

      // 6. Delete blocks involving demo users
      await prisma.block.deleteMany({
        where: {
          OR: [
            { blockerId: { in: demoUserIds } },
            { blockedId: { in: demoUserIds } }
          ]
        }
      });

      // 7. Delete reports involving demo users
      await prisma.report.deleteMany({
        where: {
          OR: [
            { reporterId: { in: demoUserIds } },
            { reportedId: { in: demoUserIds } }
          ]
        }
      });

      // 8. Delete photos & prompts for demo profiles
      const demoProfiles = await prisma.profile.findMany({
        where: { userId: { in: demoUserIds } },
        select: { id: true }
      });
      const demoProfileIds = demoProfiles.map(p => p.id);

      if (demoProfileIds.length > 0) {
        await prisma.photo.deleteMany({
          where: { profileId: { in: demoProfileIds } }
        });
        await prisma.prompt.deleteMany({
          where: { profileId: { in: demoProfileIds } }
        });
        await prisma.profile.deleteMany({
          where: { id: { in: demoProfileIds } }
        });
      }

      // 9. Finally delete demo users
      const deletedUsersResult = await prisma.user.deleteMany({
        where: { id: { in: demoUserIds } }
      });

      console.log(`[SeedService] Successfully purged ${deletedUsersResult.count} demo users and ${deletedHangoutsResult.count} demo hangouts.`);
      return { deletedUsers: deletedUsersResult.count, deletedHangouts: deletedHangoutsResult.count };
    }

    console.log(`[SeedService] No demo users found to delete. Cleaned ${deletedHangoutsResult.count} dummy hangouts.`);
    return { deletedUsers: 0, deletedHangouts: deletedHangoutsResult.count };
  } catch (error) {
    console.error('[SeedService] Error cleaning dummy data:', error);
    return { deletedUsers: 0, deletedHangouts: 0 };
  }
}

