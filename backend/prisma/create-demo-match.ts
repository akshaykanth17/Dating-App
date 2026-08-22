import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find the demo user
  const demoUser = await prisma.user.findUnique({
    where: { email: 'demo@example.com' },
  });

  if (!demoUser) {
    console.log('Demo user not found. Run create-test-user.ts first.');
    return;
  }

  // Find a dummy complete user to create a match with
  const dummyUser = await prisma.user.findFirst({
    where: { email: { startsWith: 'dummy_complete_' } },
  });

  if (!dummyUser) {
    console.log('No dummy complete user found. Run seed.ts first.');
    return;
  }

  const user1Id = demoUser.id < dummyUser.id ? demoUser.id : dummyUser.id;
  const user2Id = demoUser.id < dummyUser.id ? dummyUser.id : demoUser.id;

  // Create a match between demo user and the dummy user
  const match = await prisma.match.upsert({
    where: { user1Id_user2Id: { user1Id, user2Id } },
    create: { user1Id, user2Id },
    update: {},
  });

  console.log(`Match created between demo user and dummy user: ${match.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
