import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Layout from '../components/Layout';
import { X, Heart, ShieldAlert, ArrowLeft, ArrowRight, Star, RefreshCw, AlertCircle, User as UserIcon } from 'lucide-react';

interface Candidate {
  id: string;
  userId: string;
  name: string;
  birthdate: string;
  gender: string;
  bio: string;
  distance: number;
  photos: { id: string; url: string; isPrimary: boolean }[];
}

export default function SwipePage() {
  const { user } = useAuth();
  const { clearNewMatch } = useSocket();
  const navigate = useNavigate();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [photoIndexes, setPhotoIndexes] = useState<Record<string, number>>({}); // tracks current photo index per profile
  const [isLoading, setIsLoading] = useState(true);
  const [swipeResult, setSwipeResult] = useState<any>(null); // controls Mutual Match modal

  // Safety block/report modal states
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [reportReason, setReportReason] = useState('inappropriate_bio');
  const [reportNote, setReportNote] = useState('');
  const [safetyActionType, setSafetyActionType] = useState<'block' | 'report'>('block');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const fetchCandidates = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<Candidate[]>('/swipes/discovery');
      setCandidates(data);
      setCurrentIndex(0);
    } catch (error) {
      console.error('[SwipePage] Failed to fetch discovery candidates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.isVerified) {
      fetchCandidates();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const getAge = (birthdateString: string): number => {
    const today = new Date();
    const birthDate = new Date(birthdateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleSwipe = async (type: 'LIKE' | 'PASS') => {
    if (candidates.length === 0 || currentIndex >= candidates.length) return;

    const currentCandidate = candidates[currentIndex];
    
    // Optimistically advance card
    setCurrentIndex((prev) => prev + 1);

    try {
      const res = await api.post<any>('/swipes', {
        swipedId: currentCandidate.userId,
        type,
      });

      if (res.isMatch) {
        setSwipeResult({
          matchId: res.matchId,
          otherProfile: res.otherProfile,
        });
      }
    } catch (error) {
      console.error('[SwipePage] Swipe failed:', error);
      // rollback index if failed
      setCurrentIndex((prev) => Math.max(0, prev - 1));
    }
  };

  // Photo carousel navigation
  const nextPhoto = (candidateId: string, photosLength: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndexes((prev) => ({
      ...prev,
      [candidateId]: ((prev[candidateId] || 0) + 1) % photosLength,
    }));
  };

  const prevPhoto = (candidateId: string, photosLength: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndexes((prev) => ({
      ...prev,
      [candidateId]: ((prev[candidateId] || 0) - 1 + photosLength) % photosLength,
    }));
  };

  // Block & Report API handles
  const handleSafetyAction = async () => {
    if (candidates.length === 0 || currentIndex >= candidates.length) return;
    const currentCandidate = candidates[currentIndex];

    try {
      if (safetyActionType === 'block') {
        await api.post('/safety/block', { blockedId: currentCandidate.userId });
      } else {
        await api.post('/safety/report', {
          reportedId: currentCandidate.userId,
          reason: reportReason,
          note: reportNote,
        });
      }
      
      // Advance to next card and close modal
      setCurrentIndex((prev) => prev + 1);
      setShowSafetyModal(false);
      setReportNote('');
    } catch (error: any) {
      alert(error.message || 'Action failed.');
    }
  };

  const currentCandidate = candidates[currentIndex];
  const currentPhotoIdx = currentCandidate ? (photoIndexes[currentCandidate.id] || 0) : 0;

  return (
    <Layout>
      {/* Email Verification Banner */}
      {user && !user.isVerified && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center space-x-3 text-amber-300">
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          <div>
            <h4 className="font-bold">Email verification is pending</h4>
            <p className="text-sm opacity-90">Please verify your email address to enable profile swiping. Check your inbox for a verification link.</p>
          </div>
        </div>
      )}

      {user?.isVerified && (
        <div className="flex flex-col items-center justify-center flex-1 py-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <RefreshCw className="w-10 h-10 text-rose-500 animate-spin" />
              <p className="text-slate-400 font-medium">Finding profile matches nearby...</p>
            </div>
          ) : candidates.length === 0 || currentIndex >= candidates.length ? (
            <div className="text-center py-16 px-6 glass rounded-2xl max-w-md w-full">
              <Star className="w-16 h-16 text-rose-500/30 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-slate-100">You've seen everyone!</h3>
              <p className="text-slate-400 mt-2 text-sm leading-relaxed">
                There are no more active candidates in your area. Try adjusting your age or distance parameters in settings.
              </p>
              <button
                onClick={fetchCandidates}
                className="mt-6 flex items-center justify-center space-x-2 mx-auto px-6 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-sm font-semibold transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload feed</span>
              </button>
            </div>
          ) : (
            /* Premium Swipe Deck Card */
            <div className="relative w-full max-w-sm aspect-[3/4] md:aspect-[3.2/4] rounded-3xl overflow-hidden shadow-2xl glass border border-slate-800/80">
              
              {/* Image Carousel */}
              <div className="absolute inset-0 bg-slate-900">
                {currentCandidate.photos && currentCandidate.photos.length > 0 ? (
                  <img
                    src={currentCandidate.photos[currentPhotoIdx]?.url.startsWith('/uploads')
                      ? `${API_URL.replace('/api', '')}${currentCandidate.photos[currentPhotoIdx].url}`
                      : currentCandidate.photos[currentPhotoIdx]?.url
                    }
                    alt={currentCandidate.name}
                    className="w-full h-full object-cover select-none pointer-events-none"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-900">
                    <UserIcon className="w-20 h-20" />
                    <span className="text-xs mt-2">No photo uploaded</span>
                  </div>
                )}
                {/* Visual Vignette overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
              </div>

              {/* Photo Indicator Dots */}
              {currentCandidate.photos && currentCandidate.photos.length > 1 && (
                <div className="absolute top-4 left-0 right-0 flex justify-center space-x-1.5 z-10">
                  {currentCandidate.photos.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === currentPhotoIdx ? 'w-6 bg-rose-500' : 'w-1.5 bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Left/Right Click Zones for Image switching */}
              {currentCandidate.photos && currentCandidate.photos.length > 1 && (
                <>
                  <button
                    onClick={(e) => prevPhoto(currentCandidate.id, currentCandidate.photos.length, e)}
                    className="absolute top-0 left-0 w-1/3 bottom-24 flex items-center justify-start pl-3 opacity-0 hover:opacity-100 transition-opacity z-10"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-950/60 flex items-center justify-center text-white">
                      <ArrowLeft className="w-4 h-4" />
                    </div>
                  </button>
                  <button
                    onClick={(e) => nextPhoto(currentCandidate.id, currentCandidate.photos.length, e)}
                    className="absolute top-0 right-0 w-1/3 bottom-24 flex items-center justify-end pr-3 opacity-0 hover:opacity-100 transition-opacity z-10"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-950/60 flex items-center justify-center text-white">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </button>
                </>
              )}

              {/* Profile Bio Details Box */}
              <div className="absolute bottom-0 left-0 right-0 p-6 z-20 flex flex-col">
                <div className="flex items-baseline space-x-2">
                  <h3 className="text-2xl font-black text-slate-100">{currentCandidate.name}</h3>
                  <span className="text-xl font-bold text-slate-300">{getAge(currentCandidate.birthdate)}</span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400">
                    {currentCandidate.gender}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {currentCandidate.distance.toFixed(1)} km away
                  </span>
                </div>

                <p className="text-sm text-slate-300 mt-3 line-clamp-3 leading-relaxed">
                  {currentCandidate.bio || "No biography provided yet."}
                </p>

                {/* Primary Interaction Buttons (Swipe Controls) */}
                <div className="flex items-center justify-center space-x-6 mt-6">
                  {/* PASS button */}
                  <button
                    onClick={() => handleSwipe('PASS')}
                    className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-500/50 hover:shadow-[0_0_20px_rgba(244,63,94,0.2)] transition-all duration-300"
                  >
                    <X className="w-6 h-6" />
                  </button>

                  {/* Safety / Block button */}
                  <button
                    onClick={() => {
                      setSafetyActionType('block');
                      setShowSafetyModal(true);
                    }}
                    className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-amber-500 hover:border-amber-500/50 hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] transition-all duration-300"
                  >
                    <ShieldAlert className="w-5 h-5" />
                  </button>

                  {/* LIKE button */}
                  <button
                    onClick={() => handleSwipe('LIKE')}
                    className="w-14 h-14 rounded-full bg-rose-600 flex items-center justify-center text-white shadow-lg hover:bg-rose-500 hover:shadow-[0_0_25px_rgba(244,63,94,0.45)] transition-all duration-300"
                  >
                    <Heart className="w-6 h-6 fill-white" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Safety Modal (Block / Report overlay) */}
      {showSafetyModal && currentCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass max-w-sm w-full rounded-2xl overflow-hidden relative p-6 border border-slate-800">
            <h3 className="text-lg font-bold text-slate-100">
              {safetyActionType === 'block' ? `Block ${currentCandidate.name}?` : `Report ${currentCandidate.name}`}
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              {safetyActionType === 'block'
                ? 'They will be unmatched and you will never see each other again.'
                : 'Reports are reviewed by moderators. This will also block the user.'}
            </p>

            <div className="flex items-center space-x-4 mt-4">
              <button
                onClick={() => setSafetyActionType('block')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                  safetyActionType === 'block'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                    : 'border-slate-800 text-slate-400 hover:bg-slate-900'
                }`}
              >
                Block Only
              </button>
              <button
                onClick={() => setSafetyActionType('report')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                  safetyActionType === 'report'
                    ? 'border-rose-500 bg-rose-500/10 text-rose-400'
                    : 'border-slate-800 text-slate-400 hover:bg-slate-900'
                }`}
              >
                Report & Block
              </button>
            </div>

            {safetyActionType === 'report' && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Reason for report</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full text-sm bg-slate-900 border border-slate-800 text-slate-100 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    <option value="inappropriate_bio">Inappropriate Bio / Text</option>
                    <option value="inappropriate_photos">Inappropriate Photos</option>
                    <option value="underage_user">Under 18 user profile</option>
                    <option value="scammer_fake">Fake account / Spam</option>
                    <option value="harassment">Harassment / Abusive behavior</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Optional Details</label>
                  <textarea
                    rows={3}
                    placeholder="Provide details..."
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value)}
                    className="w-full text-sm bg-slate-900 border border-slate-800 text-slate-100 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  ></textarea>
                </div>
              </div>
            )}

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowSafetyModal(false);
                  setReportNote('');
                }}
                className="flex-1 py-2 text-sm font-semibold rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSafetyAction}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  safetyActionType === 'block' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mutual Match Modal Overlay */}
      {swipeResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="max-w-md w-full text-center relative p-6">
            <h1 className="text-4xl md:text-5xl font-black text-gradient bg-clip-text animate-bounce">
              It's a Match!
            </h1>
            <p className="text-slate-300 text-sm mt-2">
              You and {swipeResult.otherProfile?.name} have liked each other.
            </p>

            {/* Photos Side-By-Side */}
            <div className="flex items-center justify-center space-x-6 my-8">
              {/* User Photo */}
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-rose-500 shadow-2xl rotate-[-6deg]">
                {user?.profile?.photos && user.profile.photos.length > 0 ? (
                  <img
                    src={user.profile.photos[0].url.startsWith('/uploads')
                      ? `${API_URL.replace('/api', '')}${user.profile.photos[0].url}`
                      : user.profile.photos[0].url
                    }
                    alt="You"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center"><UserIcon className="w-12 h-12 text-slate-500" /></div>
                )}
              </div>

              {/* Match Photo */}
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-rose-500 shadow-2xl rotate-[6deg]">
                {swipeResult.otherProfile?.photos && swipeResult.otherProfile.photos.length > 0 ? (
                  <img
                    src={swipeResult.otherProfile.photos[0].url.startsWith('/uploads')
                      ? `${API_URL.replace('/api', '')}${swipeResult.otherProfile.photos[0].url}`
                      : swipeResult.otherProfile.photos[0].url
                    }
                    alt={swipeResult.otherProfile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center"><UserIcon className="w-12 h-12 text-slate-500" /></div>
                )}
              </div>
            </div>

            <div className="space-y-4 max-w-xs mx-auto">
              <button
                onClick={() => {
                  setSwipeResult(null);
                  clearNewMatch();
                  navigate('/chat');
                }}
                className="w-full py-3 px-4 rounded-full bg-gradient text-white text-sm font-bold shadow-lg shadow-rose-500/30 hover:opacity-90 transition-opacity"
              >
                Send Message
              </button>
              <button
                onClick={() => {
                  setSwipeResult(null);
                  clearNewMatch();
                }}
                className="w-full py-3 px-4 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors text-sm font-bold"
              >
                Keep Swiping
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
