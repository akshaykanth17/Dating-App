import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Layout from '../components/Layout';
import ProfileCardContent from '../components/ProfileCardContent';
import { X, Heart, ShieldAlert, Star, RefreshCw, AlertCircle, Sparkles, Flame, User as UserIcon } from 'lucide-react';
import { motion, useMotionValue, useTransform, useAnimation, type PanInfo } from 'framer-motion';

interface Candidate {
  id: string;
  userId: string;
  name: string;
  birthdate: string;
  gender: string;
  bio: string;
  distance: number;
  photos: { id: string; url: string; isPrimary: boolean }[];
  interests?: string[];
  prompts?: { question: string; answer: string }[];
  favoriteSpot?: string;
  job?: string;
  education?: string;
  drinking?: string;
  smoking?: string;
  gym?: string;
  height?: number;
  weight?: number;
  isSuperLike?: boolean;
}

export default function SwipePage() {
  const { user } = useAuth();
  const { clearNewMatch } = useSocket();
  const navigate = useNavigate();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [swipeResult, setSwipeResult] = useState<any>(null); // controls Mutual Match modal
  const [superLikesRemaining, setSuperLikesRemaining] = useState<number>(1);
  const [showSuperLikeEmptyModal, setShowSuperLikeEmptyModal] = useState(false);

  // Safety block/report modal states
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [reportReason, setReportReason] = useState('inappropriate_bio');
  const [reportNote, setReportNote] = useState('');
  const [safetyActionType, setSafetyActionType] = useState<'block' | 'report'>('block');

  const x = useMotionValue(0);
  const controls = useAnimation();
  
  const rotation = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, 150], [0, 1]);
  const passOpacity = useTransform(x, [0, -150], [0, 1]);
  
  // Background card effects
  const bgScale = useTransform(x, [-200, 0, 200], [1, 0.95, 1]);
  const bgFilter = useTransform(x, [-200, 0, 200], ['blur(0px)', 'blur(8px)', 'blur(0px)']);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const fetchCandidates = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<Candidate[]>('/swipes/discovery');
      setCandidates(data || []);
      setCurrentIndex(0);
    } catch (error) {
      console.error('[SwipePage] Failed to fetch discovery candidates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSuperLikeStatus = async () => {
    try {
      const res = await api.get<{ remaining: number; usedToday: boolean }>('/swipes/super-like-status');
      setSuperLikesRemaining(res.remaining ?? 1);
    } catch (err) {
      console.error('[SwipePage] Failed to fetch super like status:', err);
    }
  };

  useEffect(() => {
    // Check if tutorial should be shown for newly onboarded or first-time user
    if (user && user.isOnboarded) {
      const userTutorialKey = user.id ? `heartsync_tutorial_completed_${user.id}` : 'heartsync_tutorial_completed';
      const isCompleted = localStorage.getItem(userTutorialKey) || localStorage.getItem('heartsync_tutorial_completed');

      if (!isCompleted) {
        navigate('/tutorial');
        return;
      }
    }

    if (user?.isVerified) {
      fetchCandidates();
      fetchSuperLikeStatus();
    } else {
      setIsLoading(false);
    }
  }, [user, navigate]);


  const handleSwipe = async (type: 'LIKE' | 'PASS' | 'SUPER_LIKE') => {
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

  const handleDragEnd = async (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 100;
    if (info.offset.x > swipeThreshold) {
      await controls.start({ x: 500, opacity: 0, transition: { duration: 0.3 } });
      handleSwipe('LIKE');
      x.set(0);
      controls.set({ x: 0, opacity: 1 });
    } else if (info.offset.x < -swipeThreshold) {
      await controls.start({ x: -500, opacity: 0, transition: { duration: 0.3 } });
      handleSwipe('PASS');
      x.set(0);
      controls.set({ x: 0, opacity: 1 });
    } else {
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } });
    }
  };

  const handleSwipeClick = async (type: 'LIKE' | 'PASS') => {
    if (type === 'LIKE') {
      await controls.start({ x: 500, opacity: 0, transition: { duration: 0.3 } });
    } else {
      await controls.start({ x: -500, opacity: 0, transition: { duration: 0.3 } });
    }
    handleSwipe(type);
    x.set(0);
    controls.set({ x: 0, opacity: 1 });
  };

  const handleSuperLikeClick = async () => {
    if (superLikesRemaining <= 0) {
      setShowSuperLikeEmptyModal(true);
      return;
    }
    if (candidates.length === 0 || currentIndex >= candidates.length) return;

    await controls.start({ y: -600, opacity: 0, scale: 1.05, transition: { duration: 0.35 } });
    setSuperLikesRemaining((prev) => Math.max(0, prev - 1));
    handleSwipe('SUPER_LIKE');
    x.set(0);
    controls.set({ x: 0, y: 0, opacity: 1, scale: 1 });
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
  const nextCandidate = currentIndex + 1 < candidates.length ? candidates[currentIndex + 1] : null;

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
            /* Scrollable Profile Card Stack */
            <div className="relative w-full max-w-sm h-[75vh] md:h-[80vh] rounded-3xl overflow-hidden shadow-2xl glass border border-slate-800/80 bg-slate-950">
              
              {/* Background Card (Next Candidate or End of Stack) */}
              <motion.div 
                className="absolute inset-0 overflow-hidden pb-28 z-10 bg-slate-950 opacity-50 pointer-events-none transform origin-bottom transition-all duration-300 flex flex-col items-center justify-center rounded-3xl border border-slate-800"
                style={{ scale: bgScale, filter: bgFilter }}
              >
                {nextCandidate ? (
                  <div className="w-full h-full relative">
                    <ProfileCardContent candidate={nextCandidate} isTop={false} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center px-6">
                    <Star className="w-16 h-16 text-rose-500/30 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-100">You've seen everyone!</h3>
                    <p className="text-slate-400 mt-2 text-sm">Adjust filters to see more.</p>
                  </div>
                )}
              </motion.div>

              {/* Foreground Card (Current Candidate) */}
              <motion.div 
                className="absolute inset-0 overflow-y-auto scrollbar-hide pb-28 cursor-grab active:cursor-grabbing z-20 bg-slate-950 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                key={currentCandidate.id}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={handleDragEnd}
                style={{ x, rotate: rotation }}
                animate={controls}
              >
                <ProfileCardContent 
                  candidate={currentCandidate} 
                  isTop={true} 
                  likeOpacity={likeOpacity} 
                  passOpacity={passOpacity} 
                />
              </motion.div>

              {/* Sticky Action Buttons */}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent z-30 flex items-center justify-center space-x-4 sm:space-x-5 pointer-events-none">
                {/* PASS button */}
                <button
                  onClick={() => handleSwipeClick('PASS')}
                  className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-500/50 hover:shadow-[0_0_20px_rgba(244,63,94,0.2)] transition-all duration-300 transform hover:scale-105 pointer-events-auto"
                  title="Pass (Swipe Left)"
                >
                  <X className="w-6 h-6" />
                </button>

                {/* SUPER LIKE button */}
                <div className="relative pointer-events-auto">
                  <button
                    onClick={handleSuperLikeClick}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 shadow-lg ${
                      superLikesRemaining > 0
                        ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.5)] active:scale-95'
                        : 'bg-slate-900 border border-slate-800 text-amber-500/50 hover:text-amber-400 hover:border-amber-500/30'
                    }`}
                    title={superLikesRemaining > 0 ? 'Super Like (1 Daily Free)' : 'Daily Super Like Used (1/day)'}
                  >
                    <Star className={`w-5 h-5 ${superLikesRemaining > 0 ? 'fill-slate-950' : 'fill-none'}`} />
                  </button>
                  {/* Badge */}
                  <span className={`absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black border ${
                    superLikesRemaining > 0
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {superLikesRemaining}
                  </span>
                </div>

                {/* Safety / Block button */}
                <button
                  onClick={() => {
                    setSafetyActionType('block');
                    setShowSafetyModal(true);
                  }}
                  className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-amber-500 hover:border-amber-500/50 hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] transition-all duration-300 transform hover:scale-105 pointer-events-auto"
                  title="Safety & Report"
                >
                  <ShieldAlert className="w-5 h-5" />
                </button>

                {/* LIKE button */}
                <button
                  onClick={() => handleSwipeClick('LIKE')}
                  className="w-14 h-14 rounded-full bg-rose-600 flex items-center justify-center text-white shadow-[0_4px_15px_rgba(244,63,94,0.4)] hover:bg-rose-500 hover:shadow-[0_0_25px_rgba(244,63,94,0.6)] transition-all duration-300 transform hover:scale-105 pointer-events-auto"
                  title="Like (Swipe Right)"
                >
                  <Heart className="w-6 h-6 fill-white" />
                </button>
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
      {/* Daily Super Like Modal Overlay */}
      {showSuperLikeEmptyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="glass max-w-sm w-full rounded-3xl p-6 border border-amber-500/30 text-center relative shadow-2xl bg-slate-950/95">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center mx-auto mb-4 text-slate-950 shadow-lg shadow-amber-500/30 animate-bounce">
              <Star className="w-7 h-7 fill-slate-950" />
            </div>
            <h3 className="text-xl font-black text-slate-100">Daily Super Like Claimed</h3>
            <p className="text-slate-300 text-xs mt-2 leading-relaxed">
              You get <strong className="text-amber-400">1 free Super Like every day</strong> when you log in! You've used today's free Super Like.
            </p>
            <div className="my-4 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-left space-y-2">
              <p className="text-[11px] text-slate-400 flex items-center">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 mr-2 flex-shrink-0" />
                <span>Refreshes every night at 12:00 AM</span>
              </p>
              <p className="text-[11px] text-slate-400 flex items-center">
                <Flame className="w-3.5 h-3.5 text-rose-500 mr-2 flex-shrink-0" />
                <span>Log in daily to keep claiming free Super Likes</span>
              </p>
            </div>
            <button
              onClick={() => setShowSuperLikeEmptyModal(false)}
              className="w-full py-3 rounded-xl bg-gradient text-white text-xs font-bold shadow-lg shadow-rose-500/25 hover:opacity-90 active:scale-95 transition-all"
            >
              Got It, Keep Swiping!
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
