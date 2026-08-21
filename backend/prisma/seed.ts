/**
 * HeartSync — Seed Script
 * Creates 7 dummy users with realistic profiles and photos, plus 2 hangout events.
 * Run with: npx ts-node prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// All coordinates are near New Delhi, India (slight variation per user)
const BASE_LAT = 28.6139;
const BASE_LNG = 77.2090;

function jitter(base: number, range: number) {
  return base + (Math.random() - 0.5) * range;
}

const USERS = [
  {
    email: 'sophia@seed.heartsync.app',
    name: 'Sophia',
    gender: 'female',
    birthdate: new Date('2000-04-12'),
    bio: "Coffee addict ☕ and bookworm 📚. Looking for someone who can keep up with my weekend hike plans and lazy Sunday brunches. I make a killer pasta and I'm not afraid to brag about it.",
    gendersInterestedIn: ['male'],
    photoFile: 'sophia.jpg',
  },
  {
    email: 'liam@seed.heartsync.app',
    name: 'Liam',
    gender: 'male',
    birthdate: new Date('1997-08-23'),
    bio: "Software engineer by day, amateur chef by night. I love exploring the city on my bike, catching live music, and trying restaurants where I can't pronounce anything on the menu.",
    gendersInterestedIn: ['female'],
    photoFile: 'liam.jpg',
  },
  {
    email: 'priya@seed.heartsync.app',
    name: 'Priya',
    gender: 'female',
    birthdate: new Date('1998-01-30'),
    bio: "Doctor in training 🩺, dancer at heart 💃. If I'm not at the hospital, you'll find me at a Kathak class or binge-watching crime documentaries. Looking for someone genuine and kind.",
    gendersInterestedIn: ['male'],
    photoFile: 'priya.jpg',
  },
  {
    email: 'marcus@seed.heartsync.app',
    name: 'Marcus',
    gender: 'male',
    birthdate: new Date('1995-11-07'),
    bio: "Personal trainer 💪 who still eats pizza on Friday nights. I value honesty and deep conversations. Big on fitness, travel, and spoiling my labrador Baxter. Let's go on an adventure!",
    gendersInterestedIn: ['female'],
    photoFile: 'marcus.jpg',
  },
  {
    email: 'elena@seed.heartsync.app',
    name: 'Elena',
    gender: 'female',
    birthdate: new Date('1999-06-15'),
    bio: "Graphic designer with an obsession for vintage cameras 📷 and Parisian cafes. I speak three languages (badly) and I'm on a mission to try every dessert in the world.",
    gendersInterestedIn: ['male', 'female'],
    photoFile: 'elena.jpg',
  },
  // ── 2 NEW DISCOVER USERS ─────────────────────────────────
  {
    email: 'aryan@seed.heartsync.app',
    name: 'Aryan',
    gender: 'male',
    birthdate: new Date('1996-03-18'),
    bio: "Musician by passion, accountant by accident 🎸. I live for open-mic nights, monsoon rides, and spontaneous road trips. If you love good music and terrible puns, we'll get along great.",
    gendersInterestedIn: ['female'],
    photoFile: 'arjun.jpg',
  },
  {
    email: 'meera@seed.heartsync.app',
    name: 'Meera',
    gender: 'female',
    birthdate: new Date('2001-09-05'),
    bio: "Architecture student who collects succulents and sunsets 🌿🌅. Always planning my next trip but somehow never leaving my couch. Looking for someone to be my travel buddy for real this time!",
    gendersInterestedIn: ['male'],
    photoFile: 'priya.jpg', // reuses existing photo as placeholder
  },
];

// ── HANGOUT EVENTS ────────────────────────────────────────────
const HANGOUTS = [
  {
    creatorEmail: 'liam@seed.heartsync.app',
    title: 'Movie night at Aroma Theatre 🎬',
    location: 'Palakkad Aroma Theatre, Palakkad',
    // Tomorrow at 5 PM
    eventDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(17, 0, 0, 0);
      return d;
    })(),
  },
  {
    creatorEmail: 'marcus@seed.heartsync.app',
    title: 'Weekend morning run & chai ☕🏃',
    location: 'Lodhi Garden, New Delhi',
    // Day after tomorrow at 7 AM
    eventDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      d.setHours(7, 0, 0, 0);
      return d;
    })(),
  },
];

async function main() {
  console.log('🌱 Starting HeartSync seed...\n');

  const passwordHash = await bcrypt.hash('SeedPass123!', 10);
  const uploadsDir = path.join(__dirname, '..', 'uploads', 'seed');

  // ── Seed Users ──────────────────────────────────────────────
  for (const userData of USERS) {
    const existing = await prisma.user.findUnique({ where: { email: userData.email } });
    if (existing) {
      console.log(`  ⏭  Skipping ${userData.name} — already exists`);
      continue;
    }

    let photoUrl: string;
    const filePath = path.join(uploadsDir, userData.photoFile);
    if (fs.existsSync(filePath)) {
      photoUrl = `/uploads/seed/${userData.photoFile}`;
    } else {
      console.warn(`  ⚠  Photo not found: ${filePath}, using placeholder`);
      photoUrl = `https://randomuser.me/api/portraits/lego/1.jpg`;
    }

    const user = await prisma.user.create({
      data: {
        email: userData.email,
        passwordHash,
        isVerified: true,
        profile: {
          create: {
            name: userData.name,
            gender: userData.gender,
            birthdate: userData.birthdate,
            bio: userData.bio,
            latitude: jitter(BASE_LAT, 0.3),
            longitude: jitter(BASE_LNG, 0.3),
            ageInterestedInMin: 20,
            ageInterestedInMax: 40,
            distanceInterestedIn: 50,
            gendersInterestedIn: userData.gendersInterestedIn,
            photos: {
              create: { url: photoUrl, isPrimary: true },
            },
          },
        },
      },
    });

    console.log(`  ✅ Created ${userData.name} (${user.id})`);
  }

  // ── Seed Hangout Events ──────────────────────────────────────
  console.log('\n📅 Seeding hangout events...');

  for (const hangoutData of HANGOUTS) {
    const creator = await prisma.user.findUnique({ where: { email: hangoutData.creatorEmail } });
    if (!creator) {
      console.warn(`  ⚠  Creator not found for: ${hangoutData.creatorEmail}`);
      continue;
    }

    const existingHangout = await prisma.hangout.findFirst({
      where: { creatorId: creator.id, title: hangoutData.title },
    });

    if (existingHangout) {
      console.log(`  ⏭  Skipping hangout "${hangoutData.title}" — already exists`);
      continue;
    }

    const hangout = await prisma.hangout.create({
      data: {
        creatorId: creator.id,
        title: hangoutData.title,
        location: hangoutData.location,
        eventDate: hangoutData.eventDate,
      },
    });

    console.log(`  ✅ Created hangout "${hangout.title}"`);
  }

  // ── Seed Dummy Messages for Sophia ─────────────────────────────
  console.log('\n💬 Seeding dummy messages...');
  const sophia = await prisma.user.findUnique({ where: { email: 'sophia@seed.heartsync.app' } });
  const liam = await prisma.user.findUnique({ where: { email: 'liam@seed.heartsync.app' } });

  if (sophia && liam) {
    let match = await prisma.match.findFirst({
      where: {
        OR: [
          { user1Id: sophia.id, user2Id: liam.id },
          { user1Id: liam.id, user2Id: sophia.id }
        ]
      }
    });

    if (!match) {
      match = await prisma.match.create({
        data: { user1Id: sophia.id, user2Id: liam.id }
      });
    }

    const messageCount = await prisma.message.count({ where: { matchId: match.id } });
    if (messageCount > 0) {
      await prisma.message.deleteMany({ where: { matchId: match.id } });
      console.log(`  🗑  Cleared old chat history for Sophia and Liam`);
    }
    
    await prisma.message.createMany({
      data: [
        { matchId: match.id, senderId: sophia.id, content: "Hey Liam! I saw you like exploring the city on your bike. Any favorite routes?" },
        { matchId: match.id, senderId: liam.id, content: "Hi Sophia! Yeah, I usually bike around the central park trails early morning. What about you? Do you bike?" },
        { matchId: match.id, senderId: sophia.id, content: "I prefer hiking! But maybe I can try biking sometime. We should grab coffee!" },
        { matchId: match.id, senderId: liam.id, content: "Sounds like a plan! ☕ Let me know when you're free this weekend." },
      ]
    });
    console.log(`  ✅ Created dummy chat history for Sophia and Liam`);
  }

  console.log('\n🎉 Seed complete! 7 users + 2 hangout events + chat history ready.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
