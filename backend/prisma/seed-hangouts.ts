import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding dummy hangouts...');

  // Fetch dummy users that are 100% complete
  const dummyUsers = await prisma.user.findMany({
    where: {
      email: {
        startsWith: 'dummy_complete_'
      }
    },
    take: 10
  });

  if (dummyUsers.length === 0) {
    console.log('No dummy users found to create hangouts for.');
    return;
  }

  const hangoutIdeas = [
    { title: 'Coffee at Starbucks', location: 'Starbucks Palakkad', timeOffset: 24 * 60 * 60 * 1000 },
    { title: 'Evening Walk in the Park', location: 'Malampuzha Gardens', timeOffset: 48 * 60 * 60 * 1000 },
    { title: 'Movie Night - Latest Blockbuster', location: 'Priya Theatre', timeOffset: 12 * 60 * 60 * 1000 },
    { title: 'Trying out the new Cafe', location: 'Downtown Cafe', timeOffset: 72 * 60 * 60 * 1000 },
    { title: 'Weekend Hiking Trip', location: 'Nelliyampathy', timeOffset: 96 * 60 * 60 * 1000 },
    { title: 'Local Art Exhibition', location: 'Rappadi', timeOffset: 36 * 60 * 60 * 1000 },
    { title: 'Food Truck Festival', location: 'Stadium Stand', timeOffset: 60 * 60 * 60 * 1000 },
    { title: 'Gaming Lounge Session', location: 'Cyber Hub', timeOffset: 14 * 60 * 60 * 1000 },
    { title: 'Book Store Browsing', location: 'DC Books', timeOffset: 84 * 60 * 60 * 1000 },
    { title: 'Brunch Date', location: 'Noorjehan Cafe', timeOffset: 20 * 60 * 60 * 1000 },
  ];

  for (let i = 0; i < Math.min(dummyUsers.length, hangoutIdeas.length); i++) {
    const user = dummyUsers[i];
    const idea = hangoutIdeas[i];

    // Check if user already has a hangout to prevent duplicates
    const existing = await prisma.hangout.findFirst({
      where: { creatorId: user.id }
    });

    if (!existing) {
      await prisma.hangout.create({
        data: {
          title: idea.title,
          location: idea.location,
          eventDate: new Date(Date.now() + idea.timeOffset),
          creatorId: user.id
        }
      });
      console.log(`Created hangout "${idea.title}" for user ${user.email}`);
    }
  }

  console.log('Finished seeding hangouts!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
