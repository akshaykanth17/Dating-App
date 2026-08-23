import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Simulating the other user accepting "Continue Chat"...');

  // Find all matches that are HANGOUT and at least one user has continued
  const pendingMatches = await prisma.match.findMany({
    where: {
      matchType: 'HANGOUT',
      OR: [
        { user1Continue: true },
        { user2Continue: true }
      ]
    }
  });

  if (pendingMatches.length === 0) {
    console.log('No pending hangout matches found.');
    return;
  }

  for (const match of pendingMatches) {
    await prisma.match.update({
      where: { id: match.id },
      data: {
        user1Continue: true,
        user2Continue: true,
        matchType: 'DATING' // This moves it to the Dating tab!
      }
    });
    console.log(`Accepted match ${match.id} and moved to DATING.`);
  }

  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
