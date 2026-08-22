const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.profile.updateMany({
    where: {
      user: {
        email: {
          in: ['jessica.dummy@example.com', 'alex.dummy@example.com']
        }
      }
    },
    data: {
      latitude: 10.674196,
      longitude: 76.608673
    }
  });
  console.log('Dummy users location updated to match yours.');
}

main().finally(() => prisma.$disconnect());
