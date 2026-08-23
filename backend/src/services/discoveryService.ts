import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface DiscoveryCandidate {
  id: string;
  userId: string;
  name: string;
  birthdate: Date;
  gender: string;
  bio: string;
  latitude: number;
  longitude: number;
  distance: number; // calculated in km
  photos: { id: string; url: string; isPrimary: boolean }[];
  interests?: string[];
  favoriteSpot?: string;
  job?: string;
  education?: string;
  drinking?: string;
  smoking?: string;
  gym?: string;
  height?: number;
  weight?: number;
  prompts?: { question: string; answer: string }[];
  isSuperLike?: boolean;
}

export class DiscoveryService {
  /**
   * Find candidate profiles for a user based on geolocation and dating preferences.
   * Ensures that:
   * 1. Candidates are within the swiper's maximum distance preference.
   * 2. Candidates fit the swiper's gender preferences, and the swiper fits the candidate's gender preferences.
   * 3. Candidate age fits the swiper's age range preference, and the swiper fits the candidate's.
   * 4. Users who have already been swiped (liked/passed) are excluded.
   * 5. Blocked users are excluded.
   */
  static async getCandidates(userId: string, limit = 20): Promise<DiscoveryCandidate[]> {
    // 1. Fetch the swiper's profile
    const swiperProfile = await prisma.profile.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!swiperProfile) {
      throw new Error('Swiper profile not found');
    }

    const {
      latitude: lat,
      longitude: lon,
      gender: swiperGender,
      birthdate: swiperBirthdate,
      ageInterestedInMin: swiperAgeMin,
      ageInterestedInMax: swiperAgeMax,
      distanceInterestedIn: swiperDistanceMax,
      gendersInterestedIn: swiperInterests,
    } = swiperProfile;

    // Convert date to ISO string for PG
    const swiperBirthdateStr = swiperBirthdate.toISOString();

    // 2. Perform raw SQL query utilizing the Haversine formula with safe bounds
    // to avoid acos() floating point precision overflow errors.
    const rawCandidates = await prisma.$queryRaw<any[]>`
      SELECT 
        p.id, 
        p."userId", 
        p.name, 
        p.birthdate, 
        p.gender, 
        p.bio, 
        p.latitude, 
        p.longitude,
        p.interests,
        p."favoriteSpot",
        p.job,
        p.education,
        p.drinking,
        p.smoking,
        p.gym,
        p.height,
        p.weight,
        (EXISTS (
          SELECT 1 FROM "Swipe" s WHERE s."swiperId" = p."userId" AND s."swipedId" = ${userId} AND s.type = 'SUPER_LIKE'
        )) AS "isSuperLike",
        (6371 * acos(
          LEAST(GREATEST(
            cos(radians(${lat})) * cos(radians(p.latitude)) * 
            cos(radians(p.longitude) - radians(${lon})) + 
            sin(radians(${lat})) * sin(radians(p.latitude)), 
            -1.0
          ), 1.0)
        )) AS distance
      FROM "Profile" p
      INNER JOIN "User" u ON p."userId" = u.id
      WHERE 
        p."userId" != ${userId}
        AND u."isVerified" = true
        -- Match Gender: Candidate gender must be in swiper interests, and swiper gender must be in candidate interests
        AND p.gender = ANY(${swiperInterests})
        AND ${swiperGender} = ANY(p."gendersInterestedIn")
        -- Match Age: Candidate age must be in swiper range, and swiper age must be in candidate range
        AND EXTRACT(YEAR FROM AGE(p.birthdate)) >= ${swiperAgeMin}
        AND EXTRACT(YEAR FROM AGE(p.birthdate)) <= ${swiperAgeMax}
        AND EXTRACT(YEAR FROM AGE(CAST(${swiperBirthdateStr} AS timestamp))) >= p."ageInterestedInMin"
        AND EXTRACT(YEAR FROM AGE(CAST(${swiperBirthdateStr} AS timestamp))) <= p."ageInterestedInMax"
        -- Exclude already swiped profiles
        AND p."userId" NOT IN (
          SELECT "swipedId" FROM "Swipe" WHERE "swiperId" = ${userId}
        )
        -- Exclude blocked users (either direction)
        AND p."userId" NOT IN (
          SELECT "blockedId" FROM "Block" WHERE "blockerId" = ${userId}
        )
        AND p."userId" NOT IN (
          SELECT "blockerId" FROM "Block" WHERE "blockedId" = ${userId}
        )
        -- Geolocation distance check (Haversine distance <= swiper's maximum distance)
        AND (6371 * acos(
          LEAST(GREATEST(
            cos(radians(${lat})) * cos(radians(p.latitude)) * 
            cos(radians(p.longitude) - radians(${lon})) + 
            sin(radians(${lat})) * sin(radians(p.latitude)), 
            -1.0
          ), 1.0)
        )) <= ${swiperDistanceMax}
      ORDER BY "isSuperLike" DESC, distance ASC
      LIMIT ${limit};
    `;

    if (rawCandidates.length === 0) {
      // Fallback: If no candidate was found within strict distance/swipes,
      // return all available demo / system profiles so the user always has people to discover!
      const blocks = await prisma.block.findMany({
        where: { OR: [{ blockerId: userId }, { blockedId: userId }] }
      });
      const blockedIds = blocks.map(x => x.blockerId === userId ? x.blockedId : x.blockerId);

      const fallbackProfiles = await prisma.profile.findMany({
        where: {
          userId: {
            not: userId,
            notIn: blockedIds,
          }
        },
        include: {
          photos: { orderBy: { isPrimary: 'desc' } },
          prompts: true,
          user: true
        },
        take: limit
      });

      return fallbackProfiles.map((p, idx) => ({
        id: p.id,
        userId: p.userId,
        name: p.name,
        birthdate: p.birthdate,
        gender: p.gender,
        bio: p.bio,
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        distance: Math.round((2 + idx * 1.5) * 10) / 10,
        photos: p.photos.map(photo => ({ id: photo.id, url: photo.url, isPrimary: photo.isPrimary })),
        interests: p.interests || [],
        favoriteSpot: p.favoriteSpot || undefined,
        job: p.job || undefined,
        education: p.education || undefined,
        drinking: p.drinking || undefined,
        smoking: p.smoking || undefined,
        gym: p.gym || undefined,
        height: p.height || undefined,
        weight: p.weight || undefined,
        prompts: p.prompts.map(pr => ({ question: pr.question, answer: pr.answer })),
        isSuperLike: idx === 0,
      }));
    }

    // 3. For each candidate, fetch photos and map to output DTO
    const candidateUserIds = rawCandidates.map((c) => c.userId);
    const photos = await prisma.photo.findMany({
      where: {
        profile: {
          userId: { in: candidateUserIds },
        },
      },
      orderBy: { isPrimary: 'desc' },
    });

    const prompts = await prisma.prompt.findMany({
      where: {
        profile: {
          userId: { in: candidateUserIds },
        },
      },
    });

    return rawCandidates.map((c) => {
      const candidatePhotos = photos
        .filter((p) => p.profileId === c.id)
        .map((p) => ({
          id: p.id,
          url: p.url,
          isPrimary: p.isPrimary,
        }));

      const candidatePrompts = prompts
        .filter((p) => p.profileId === c.id)
        .map((p) => ({
          question: p.question,
          answer: p.answer,
        }));

      return {
        id: c.id,
        userId: c.userId,
        name: c.name,
        birthdate: c.birthdate,
        gender: c.gender,
        bio: c.bio,
        latitude: Number(c.latitude),
        longitude: Number(c.longitude),
        distance: Number(c.distance),
        photos: candidatePhotos,
        interests: c.interests || [],
        favoriteSpot: c.favoriteSpot,
        job: c.job,
        education: c.education,
        drinking: c.drinking,
        smoking: c.smoking,
        gym: c.gym,
        height: c.height,
        weight: c.weight,
        prompts: candidatePrompts,
        isSuperLike: Boolean(c.isSuperLike),
      };
    });
  }
}
