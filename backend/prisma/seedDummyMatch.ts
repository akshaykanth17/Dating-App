import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding dummy profile for match testing...');

  let dummyUser = await prisma.user.findUnique({
    where: { email: 'dummy_match@example.com' },
  });

  if (!dummyUser) {
    dummyUser = await prisma.user.create({
      data: {
        email: 'dummy_match@example.com',
        authProvider: 'email',
        isVerified: true,
        isOnboarded: true,
      },
    });

    const dummyProfile = await prisma.profile.create({
      data: {
        userId: dummyUser.id,
        name: 'Taylor (Test Match)',
        birthdate: new Date('1995-05-15'),
        gender: 'female',
        bio: 'I am a dummy profile created for testing matches! Swipe right on me to see the confetti.',
        latitude: 25.2048, // Defaulting to somewhere, doesn't matter as long as it's within distance or distance filter is large enough
        longitude: 55.2708,
        gendersInterestedIn: ['male', 'female', 'other'],
        interests: ['Testing', 'Coding', 'Matches'],
      },
    });

    await prisma.photo.create({
      data: {
        profileId: dummyProfile.id,
        url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800',
        isPrimary: true,
      },
    });

    console.log('Created dummy user and profile: ', dummyUser.id);
  } else {
    console.log('Dummy user already exists: ', dummyUser.id);
  }

  // Now, make this dummy user swipe right on EVERY other user in the database
  const allOtherUsers = await prisma.user.findMany({
    where: { id: { not: dummyUser.id } },
  });

  let swipeCount = 0;
  for (const user of allOtherUsers) {
    // Check if swipe already exists
    const existingSwipe = await prisma.swipe.findUnique({
      where: {
        swiperId_swipedId: {
          swiperId: dummyUser.id,
          swipedId: user.id,
        },
      },
    });

    if (!existingSwipe) {
      await prisma.swipe.create({
        data: {
          swiperId: dummyUser.id,
          swipedId: user.id,
          type: 'LIKE',
        },
      });
      swipeCount++;
    }
  }

  console.log(`Dummy user liked ${swipeCount} new users. Login as any of them and swipe right on Taylor to get a match!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
