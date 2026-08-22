import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const password = 'dummy_hash_for_testing';

  // User 1: Jessica, 24, Female (For male users to discover)
  try {
    const user1 = await prisma.user.create({
      data: {
        email: 'jessica.dummy@example.com',
        passwordHash: password,
        isVerified: true,
        profile: {
          create: {
            name: 'Jessica',
            birthdate: new Date('2000-05-15T00:00:00Z'),
            gender: 'female',
            bio: 'I love exploring new coffee shops and going for long hikes!',
            latitude: 28.6139,
            longitude: 77.2090, // New Delhi default
            gendersInterestedIn: ['male', 'female'],
            ageInterestedInMin: 20,
            ageInterestedInMax: 35,
            distanceInterestedIn: 100,
            interests: ['Coffee', 'Hiking', 'Photography'],
            favoriteSpot: 'Central Park',
            job: 'Graphic Designer',
            education: 'NYU',
            gym: 'active',
            drinking: 'sometimes',
            smoking: 'no',
            height: 165,
            weight: 55,
            photos: {
              create: [
                {
                  url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                  isPrimary: true
                },
                {
                  url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                  isPrimary: false
                }
              ]
            },
            prompts: {
              create: [
                {
                  question: 'First date will be like...',
                  answer: 'Grabbing matcha lattes and walking through the park.'
                },
                {
                  question: 'A random fact I love is...',
                  answer: 'Wombats have cube-shaped poop. Yes, really.'
                }
              ]
            }
          }
        }
      }
    });
    console.log('Created Jessica (jessica.dummy@example.com)');
  } catch (err: any) {
    console.log('Jessica might already exist or error:', err.message);
  }

  // User 2: Alex, 27, Male (For female users to discover)
  try {
    const user2 = await prisma.user.create({
      data: {
        email: 'alex.dummy@example.com',
        passwordHash: password,
        isVerified: true,
        profile: {
          create: {
            name: 'Alex',
            birthdate: new Date('1997-08-22T00:00:00Z'),
            gender: 'male',
            bio: 'Tech nerd by day, amateur chef by night. Looking for someone to test my recipes on.',
            latitude: 28.6145, // Slightly offset from default
            longitude: 77.2085,
            gendersInterestedIn: ['female'],
            ageInterestedInMin: 20,
            ageInterestedInMax: 32,
            distanceInterestedIn: 100,
            interests: ['Cooking', 'Technology', 'Movies', 'Gaming'],
            favoriteSpot: 'My kitchen',
            job: 'Software Engineer',
            education: 'Stanford',
            gym: 'sometimes',
            drinking: 'yes',
            smoking: 'no',
            height: 182,
            weight: 78,
            photos: {
              create: [
                {
                  url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                  isPrimary: true
                },
                {
                  url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                  isPrimary: false
                },
                {
                  url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                  isPrimary: false
                }
              ]
            },
            prompts: {
              create: [
                {
                  question: 'I geek out on...',
                  answer: 'Mechanical keyboards and sci-fi movies.'
                },
                {
                  question: 'My simple pleasures...',
                  answer: 'A perfectly brewed pour-over coffee on a Sunday morning.'
                }
              ]
            }
          }
        }
      }
    });
    console.log('Created Alex (alex.dummy@example.com)');
  } catch (err: any) {
    console.log('Alex might already exist or error:', err.message);
  }

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
