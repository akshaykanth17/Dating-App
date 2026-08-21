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
      ORDER BY distance ASC
      LIMIT ${limit};
    `;

    if (rawCandidates.length === 0) {
      return [];
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

    return rawCandidates.map((c) => {
      const candidatePhotos = photos
        .filter((p) => p.profileId === c.id)
        .map((p) => ({
          id: p.id,
          url: p.url,
          isPrimary: p.isPrimary,
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
      };
    });
  }
}
