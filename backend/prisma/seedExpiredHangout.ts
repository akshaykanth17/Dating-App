import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding expired hangout...');

  // Get two dummy users
  const users = await prisma.user.findMany({ take: 2 });
  if (users.length < 2) {
    console.log('Need at least 2 users in the database to seed.');
    return;
  }
  const creator = users[0];
  const participant = users[1];

  // Create a hangout that ended 1 minute ago
  const pastDate = new Date(Date.now() - 60 * 1000);

  const hangout = await prisma.hangout.create({
    data: {
      creatorId: creator.id,
      title: 'Coffee Date (Expired)',
      location: 'Central Perk',
      eventDate: pastDate,
    }
  });

  // Create a HANGOUT match between them
  const match = await prisma.match.create({
    data: {
      user1Id: creator.id,
      user2Id: participant.id,
      matchType: 'HANGOUT',
      hangoutId: hangout.id,
    }
  });

  // Send an initial message to the match
  await prisma.message.create({
    data: {
      matchId: match.id,
      senderId: participant.id,
      content: 'Hey, I am looking forward to this hangout!',
    }
  });

  console.log('Successfully created expired Hangout and Match!');
  console.log(`Hangout ID: ${hangout.id}`);
  console.log(`Match ID: ${match.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
