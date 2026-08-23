import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding expired hangout for all users...');

  // Get all users
  const users = await prisma.user.findMany();
  if (users.length < 2) {
    console.log('Need at least 2 users in the database to seed.');
    return;
  }

  // Create a dummy "Event Host" user if needed, or just use users[0]
  const creator = users[0];

  // Create a hangout that ended 1 minute ago
  const pastDate = new Date(Date.now() - 60 * 1000);

  const hangout = await prisma.hangout.create({
    data: {
      creatorId: creator.id,
      title: 'Post-Event Hangout Demo',
      location: 'Central Perk',
      eventDate: pastDate,
    }
  });

  // Create a HANGOUT match between the creator and EVERY OTHER user
  for (const user of users) {
    if (user.id === creator.id) continue;

    // Check if match already exists
    const existing = await prisma.match.findFirst({
      where: {
        OR: [
          { user1Id: creator.id, user2Id: user.id },
          { user1Id: user.id, user2Id: creator.id },
        ],
        matchType: 'HANGOUT'
      }
    });

    if (!existing) {
      const match = await prisma.match.create({
        data: {
          user1Id: creator.id,
          user2Id: user.id,
          matchType: 'HANGOUT',
          hangoutId: hangout.id,
        }
      });

      // Send an initial message to the match
      await prisma.message.create({
        data: {
          matchId: match.id,
          senderId: creator.id,
          content: 'Hey, thanks for joining the event! Do you want to keep chatting?',
        }
      });
      console.log(`Created expired match for user ${user.id}`);
    }
  }

  console.log('Successfully created expired Hangout and Matches for all users!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
