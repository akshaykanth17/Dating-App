import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating dummy profile location...');

  const dummyUser = await prisma.user.findUnique({
    where: { email: 'dummy_match@example.com' },
    include: { profile: true },
  });

  if (!dummyUser || !dummyUser.profile) {
    console.log('Dummy user not found!');
    return;
  }

  // Find the first OTHER user to copy location from
  const realUser = await prisma.user.findFirst({
    where: { id: { not: dummyUser.id } },
    include: { profile: true },
  });

  if (!realUser || !realUser.profile) {
    console.log('No real user with a profile found!');
    return;
  }

  await prisma.profile.update({
    where: { id: dummyUser.profile.id },
    data: {
      latitude: realUser.profile.latitude,
      longitude: realUser.profile.longitude,
    },
  });

  console.log(`Updated dummy user location to ${realUser.profile.latitude}, ${realUser.profile.longitude}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
