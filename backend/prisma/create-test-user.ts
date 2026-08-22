import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'demo@example.com';
  const password = 'demo123';
  
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    console.log('Demo user already exists.');
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  await prisma.user.create({
    data: {
      email,
      passwordHash: hash,
      isVerified: true,
      isOnboarded: true,
      profile: {
        create: {
          name: 'Demo Tester',
          birthdate: new Date('1995-01-01'),
          gender: 'male',
          bio: 'I am a test automation user.',
          latitude: 10.67,
          longitude: 76.60,
          gendersInterestedIn: ['female', 'male'],
          photos: {
            create: [
              { url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80', isPrimary: true }
            ]
          }
        }
      }
    }
  });

  console.log('Demo user created!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
