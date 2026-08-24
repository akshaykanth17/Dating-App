import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const firstNames = ['Arjun', 'Sanya', 'Rohan', 'Meera', 'Vikram', 'Ananya', 'Kavya', 'Rishabh', 'Tara', 'Aditya', 'Ishaan', 'Diya'];
const photos = [
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517365830460-955ce3ccd263?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80'
];

async function main() {
  console.log('Seeding MORE dummy data...');

  for (let i = 0; i < 12; i++) {
    const isFemale = i % 2 === 0;
    const name = firstNames[i];
    const timestamp = Date.now();
    
    // Slight random offset around Palakkad coordinates (10.67, 76.60)
    const latOffset = (Math.random() - 0.5) * 0.1;
    const lngOffset = (Math.random() - 0.5) * 0.1;
    
    const user = await prisma.user.create({
      data: {
        email: `dummy_complete_${name.toLowerCase()}_${timestamp}@example.com`,
        passwordHash: 'dummyhash',
        isVerified: true,
        isOnboarded: true,
        profile: {
          create: {
            name: name,
            birthdate: new Date(`199${Math.floor(Math.random() * 9)}-0${Math.floor(Math.random() * 8) + 1}-15`),
            gender: isFemale ? 'female' : 'male',
            bio: `Hello from ${name}! I'm just another dummy profile added so you can test the swipe stack effect. Happy swiping!`,
            latitude: 10.67 + latOffset,
            longitude: 76.60 + lngOffset,
            interests: ['Testing', 'UI Design', 'Swiping', 'Coffee'],
            job: 'Software Engineer',
            education: 'Stanford University',
            drinking: 'Socially',
            smoking: 'Never',
            gym: 'Everyday',
            height: 160 + Math.floor(Math.random() * 30),
            weight: 60 + Math.floor(Math.random() * 20),
            favoriteSpot: 'Central Park',
            gendersInterestedIn: ['male', 'female'],
            photos: {
              create: [
                {
                  url: photos[i],
                  isPrimary: true,
                },
                {
                  url: photos[(i + 1) % photos.length],
                  isPrimary: false,
                }
              ]
            },
            prompts: {
              create: [
                {
                  question: 'I geek out on...',
                  answer: 'Building amazing UI components and debugging race conditions.'
                },
                {
                  question: 'First round is on me if...',
                  answer: 'You can beat me at Mario Kart.'
                }
              ]
            }
          }
        }
      }
    });
    console.log(`Created test user: ${user.email}`);
  }

  console.log('Seeding complete! You now have 12 more profiles to swipe.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
