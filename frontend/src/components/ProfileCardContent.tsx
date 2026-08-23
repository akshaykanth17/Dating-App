import React from 'react';
import { UserIcon, Star, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { getPhotoUrl, handleImageError } from '../utils/photoUrl';

const getAge = (birthdate: string) => {
  if (!birthdate) return '';
  const diff = Date.now() - new Date(birthdate).getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

export interface ProfileCardData {
  id: string;
  name: string;
  birthdate?: string;
  gender?: string;
  distance?: number;
  bio?: string;
  interests?: string[];
  job?: string;
  education?: string;
  height?: number;
  weight?: number;
  gym?: string;
  drinking?: string;
  smoking?: string;
  favoriteSpot?: string;
  photos?: { id: string; url: string; isPrimary: boolean }[];
  prompts?: { question: string; answer: string }[];
  isSuperLike?: boolean;
}

interface ProfileCardContentProps {
  candidate: ProfileCardData;
  isTop?: boolean;
  likeOpacity?: any;
  passOpacity?: any;
}

export default function ProfileCardContent({ candidate, isTop, likeOpacity, passOpacity }: ProfileCardContentProps) {
  const primaryPhoto = candidate?.photos?.find((p) => p.isPrimary) || candidate?.photos?.[0];
  const otherPhotos = candidate?.photos?.filter((p) => p.id !== primaryPhoto?.id) || [];

  return (
    <>
      {/* LIKE / PASS Stamps (Only on top card) */}
      {isTop && likeOpacity && passOpacity && (
        <>
          <motion.div
            className="absolute top-10 left-6 z-40 px-6 py-2 rounded-xl border-4 border-emerald-500 text-emerald-400 font-black text-3xl tracking-widest rotate-[-12deg] pointer-events-none"
            style={{ opacity: likeOpacity }}
          >
            LIKE
          </motion.div>
          <motion.div
            className="absolute top-10 right-6 z-40 px-6 py-2 rounded-xl border-4 border-rose-500 text-rose-400 font-black text-3xl tracking-widest rotate-[12deg] pointer-events-none"
            style={{ opacity: passOpacity }}
          >
            DISLIKE
          </motion.div>
        </>
      )}

      {/* Primary Image Section */}
      <div className="relative w-full aspect-[3/4] md:aspect-[3.2/4]">
        {candidate.isSuperLike && (
          <div className="absolute top-4 left-4 z-40 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 text-white font-black text-xs shadow-lg shadow-amber-500/30 flex items-center space-x-1.5 border border-amber-300/40 animate-pulse">
            <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
            <span>SUPER LIKED YOU!</span>
          </div>
        )}
        {primaryPhoto ? (
          <img
            src={getPhotoUrl(primaryPhoto.url)}
            alt={candidate.name}
            onError={handleImageError}
            className="w-full h-full object-cover select-none pointer-events-none"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-900">
            <UserIcon className="w-20 h-20" />
            <span className="text-xs mt-2">No photo uploaded</span>
          </div>
        )}
        {/* Visual Vignette overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>

        {/* Profile Basic Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 z-20 flex flex-col">
          <div className="flex items-baseline space-x-2">
            <h3 className="text-3xl font-black text-slate-100 drop-shadow-md">{candidate.name}</h3>
            {candidate.birthdate && (
              <span className="text-2xl font-bold text-slate-300 drop-shadow-md">{getAge(candidate.birthdate)}</span>
            )}
          </div>
          <div className="flex items-center space-x-2 mt-2">
            {candidate.gender && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 backdrop-blur-sm">
                {candidate.gender}
              </span>
            )}
            {candidate.distance !== undefined && (
              <span className="text-xs text-slate-300 font-medium drop-shadow-sm">
                {candidate.distance.toFixed(1)} km away
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bio Section */}
      {candidate.bio && (
        <div className="p-6">
          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">About Me</h4>
          <p className="text-base text-slate-200 leading-relaxed">{candidate.bio}</p>
        </div>
      )}

      {/* Interests & Details */}
      <div className="px-6 pb-6 space-y-4">
        {candidate.interests && candidate.interests.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Interests</h4>
            <div className="flex flex-wrap gap-2">
              {candidate.interests.map((interest, idx) => (
                <span key={idx} className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Info Pills */}
        <div className="flex flex-wrap gap-2">
          {candidate.job && (
            <span className="px-3 py-1 rounded-full border border-slate-700 text-slate-400 text-xs font-medium flex items-center space-x-1">
              💼 <span>{candidate.job}</span>
            </span>
          )}
          {candidate.education && (
            <span className="px-3 py-1 rounded-full border border-slate-700 text-slate-400 text-xs font-medium flex items-center space-x-1">
              🎓 <span>{candidate.education}</span>
            </span>
          )}
          {candidate.height && (
            <span className="px-3 py-1 rounded-full border border-slate-700 text-slate-400 text-xs font-medium flex items-center space-x-1">
              📏 <span>{candidate.height} cm</span>
            </span>
          )}
          {candidate.weight && (
            <span className="px-3 py-1 rounded-full border border-slate-700 text-slate-400 text-xs font-medium flex items-center space-x-1">
              ⚖️ <span>{candidate.weight} kg</span>
            </span>
          )}
          {candidate.gym && (
            <span className="px-3 py-1 rounded-full border border-slate-700 text-slate-400 text-xs font-medium flex items-center space-x-1">
              💪 <span>Gym: {candidate.gym}</span>
            </span>
          )}
          {candidate.drinking && (
            <span className="px-3 py-1 rounded-full border border-slate-700 text-slate-400 text-xs font-medium flex items-center space-x-1">
              🍷 <span>Drinks: {candidate.drinking}</span>
            </span>
          )}
          {candidate.smoking && (
            <span className="px-3 py-1 rounded-full border border-slate-700 text-slate-400 text-xs font-medium flex items-center space-x-1">
              🚬 <span>Smokes: {candidate.smoking}</span>
            </span>
          )}
          {candidate.favoriteSpot && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(candidate.favoriteSpot)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="px-3 py-1 rounded-full border border-slate-700 hover:border-rose-500/60 bg-slate-900/70 hover:bg-slate-900 text-rose-400 text-xs font-medium flex items-center space-x-1 transition-all cursor-pointer group shadow-sm"
              title="Open favorite spot in Google Maps"
            >
              <MapPin className="w-3 h-3 text-rose-500 flex-shrink-0" />
              <span className="group-hover:text-rose-300">Fav spot: {candidate.favoriteSpot}</span>
              <span className="text-[10px] text-rose-400/80 group-hover:underline ml-0.5">↗</span>
            </a>
          )}
        </div>
      </div>

      {/* Interleaved Prompts and Other Photos */}
      <div className="flex flex-col space-y-4 px-4 pb-6 mt-4">
        {Array.from({ length: Math.max(otherPhotos.length, candidate.prompts?.length || 0) }).map((_, i) => (
          <React.Fragment key={i}>
            {candidate.prompts?.[i] && candidate.prompts[i].question && candidate.prompts[i].answer && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50">
                <p className="text-xs text-rose-400 font-bold mb-2 uppercase tracking-wider">
                  {candidate.prompts[i].question}
                </p>
                <p className="text-lg text-slate-200 font-serif italic">"{candidate.prompts[i].answer}"</p>
              </div>
            )}
            {otherPhotos[i] && (
              <div className="w-full rounded-2xl overflow-hidden shadow-lg aspect-[3/4]">
                <img
                  src={getPhotoUrl(otherPhotos[i].url)}
                  alt={`${candidate.name} detail`}
                  onError={handleImageError}
                  className="w-full h-full object-cover select-none pointer-events-none"
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </>
  );
}
