import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence, useMotionValue, useTransform, useAnimation, type PanInfo } from 'framer-motion';
import { 
  Heart, 
  X, 
  Star, 
  Flame, 
  ShieldCheck, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  Compass, 
  ShieldAlert,
  CheckCircle2,
  PartyPopper
} from 'lucide-react';

export default function TutorialPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressTimerRef = useRef<any>(null);

  // Practice Card 1 State (Pass Practice)
  const [passCompleted, setPassCompleted] = useState(false);
  const passControls = useAnimation();
  const passX = useMotionValue(0);
  const passRotate = useTransform(passX, [-200, 200], [-15, 15]);
  const passStampOpacity = useTransform(passX, [0, -80], [0, 1]);

  // Practice Card 2 State (Like Practice)
  const [likeCompleted, setLikeCompleted] = useState(false);
  const likeControls = useAnimation();
  const likeX = useMotionValue(0);
  const likeRotate = useTransform(likeX, [-200, 200], [-15, 15]);
  const likeStampOpacity = useTransform(likeX, [0, 80], [0, 1]);

  const SLIDE_DURATION = 9000; // 9 seconds for informative slides

  const handlePassSwipe = async () => {
    await passControls.start({ x: -400, opacity: 0, rotate: -20, transition: { duration: 0.3 } });
    setPassCompleted(true);
  };

  const handlePassDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -60) {
      handlePassSwipe();
    } else {
      passControls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } });
    }
  };

  const handleLikeSwipe = async () => {
    await likeControls.start({ x: 400, opacity: 0, rotate: 20, transition: { duration: 0.3 } });
    setLikeCompleted(true);
  };

  const handleLikeDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > 60) {
      handleLikeSwipe();
    } else {
      likeControls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } });
    }
  };

  const finishTutorial = () => {
    if (user?.id) {
      localStorage.setItem(`heartsync_tutorial_completed_${user.id}`, 'true');
    }
    localStorage.setItem('heartsync_tutorial_completed', 'true');
    localStorage.removeItem('heartsync_trigger_tutorial');
    navigate('/');
  };

  const slides = [
    // Slide 0: Welcome & Setup Complete
    {
      badge: 'Welcome to HeartSync',
      title: user?.profile?.name ? `You're ready, ${user.profile.name}!` : "You're All Set!",
      subtitle: 'Your profile is live and verified. Complete this quick interactive practice to learn how swiping, hangouts, and matches work.',
      accentGlow: 'bg-rose-500/20',
      isInteractive: false,
      illustration: (
        <div className="relative w-full max-w-sm mx-auto h-64 flex flex-col items-center justify-center">
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute w-52 h-52 rounded-full border border-rose-500/30"
          />
          <motion.div 
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute w-40 h-40 rounded-full border border-pink-500/40"
          />
          
          <motion.div 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="relative w-28 h-28 rounded-3xl bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 p-0.5 shadow-[0_0_50px_rgba(244,63,94,0.5)] flex items-center justify-center"
          >
            <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
              <Flame className="w-14 h-14 text-rose-500 fill-rose-500 animate-pulse" />
            </div>
          </motion.div>

          <div className="flex items-center space-x-2 mt-6">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> 18+ Profile Verified
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <Sparkles className="w-3.5 h-3.5 mr-1" /> Ready to Practice
            </span>
          </div>
        </div>
      ),
      tip: 'Tap "Next" or the right side of the screen to begin interactive practice.'
    },

    // Slide 1: Practice Action #1 - SWIPE LEFT (PASS)
    {
      badge: 'Interactive Practice 1/2',
      title: 'Practice: Swipe Left to Pass',
      subtitle: 'Drag the bot profile card to the left, or tap the ✖️ button to pass on a profile.',
      accentGlow: 'bg-rose-500/20',
      isInteractive: true,
      illustration: (
        <div className="relative w-full max-w-sm mx-auto h-72 flex flex-col items-center justify-center">
          {!passCompleted ? (
            <div className="relative w-full flex flex-col items-center">
              {/* Practice Instruction Callout Banner */}
              <motion.div 
                animate={{ x: [-6, 0, -6] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="mb-2.5 px-3.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center shadow-lg"
              >
                👈 Drag card LEFT or tap ✖️
              </motion.div>

              {/* Interactive Swipeable Card */}
              <motion.div
                style={{ x: passX, rotate: passRotate }}
                drag="x"
                dragConstraints={{ left: -300, right: 300 }}
                onDragEnd={handlePassDragEnd}
                animate={passControls}
                className="w-64 h-52 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-700/80 p-4 shadow-2xl flex flex-col justify-between cursor-grab active:cursor-grabbing select-none relative overflow-hidden"
              >
                {/* PASS stamp indicator */}
                <motion.div 
                  style={{ opacity: passStampOpacity }}
                  className="absolute top-4 left-4 z-20 px-3 py-1 bg-rose-600 text-white font-black text-xs rounded-lg border border-white/20 uppercase tracking-wider rotate-[-12deg] shadow-lg pointer-events-none"
                >
                  PASS ✖️
                </motion.div>

                {/* Bot Profile Details */}
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center text-lg">
                    🤖
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <p className="font-bold text-slate-100 text-sm">Alex (Demo Bot), 26</p>
                    </div>
                    <p className="text-[10px] text-slate-400 flex items-center">
                      <Compass className="w-3 h-3 mr-1 text-rose-400" /> 5 km away · Gaming & Sci-Fi
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-300 italic bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                  "Practice your swipe left on me! I won't be offended 😊"
                </p>

                {/* Practice Action Buttons */}
                <div className="flex items-center justify-center space-x-4 pt-1">
                  <button
                    onClick={handlePassSwipe}
                    className="w-10 h-10 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-400 hover:bg-rose-500 hover:text-white transition-all shadow-md active:scale-95"
                    title="Click to Pass"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="w-8 h-8 rounded-full bg-slate-950/60 border border-slate-700 flex items-center justify-center text-slate-500 opacity-50">
                    <Star className="w-4 h-4" />
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-950/60 border border-slate-700 flex items-center justify-center text-slate-500 opacity-50">
                    <Heart className="w-5 h-5" />
                  </div>
                </div>
              </motion.div>
            </div>
          ) : (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/40 text-center space-y-2.5 max-w-xs shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-100">Nice Job! You Passed</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Passing lets you skip a profile privately without sending any notification.
              </p>
              <button
                onClick={() => {
                  setCurrentSlide(2);
                  setProgress(0);
                }}
                className="mt-2 w-full py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors"
              >
                Try Swipe Right (Like) 👉
              </button>
            </motion.div>
          )}
        </div>
      ),
      tip: 'You can also tap the ✖️ button if you prefer clicking over dragging.'
    },

    // Slide 2: Practice Action #2 - SWIPE RIGHT (LIKE & MATCH)
    {
      badge: 'Interactive Practice 2/2',
      title: 'Practice: Swipe Right to Like',
      subtitle: 'Drag the bot profile card to the right, or tap the ❤️ button to send a Like and trigger a mutual match!',
      accentGlow: 'bg-emerald-500/20',
      isInteractive: true,
      illustration: (
        <div className="relative w-full max-w-sm mx-auto h-72 flex flex-col items-center justify-center">
          {!likeCompleted ? (
            <div className="relative w-full flex flex-col items-center">
              {/* Practice Instruction Callout Banner */}
              <motion.div 
                animate={{ x: [0, 6, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="mb-2.5 px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center shadow-lg"
              >
                Drag card RIGHT or tap ❤️ 👉
              </motion.div>

              {/* Interactive Swipeable Card */}
              <motion.div
                style={{ x: likeX, rotate: likeRotate }}
                drag="x"
                dragConstraints={{ left: -300, right: 300 }}
                onDragEnd={handleLikeDragEnd}
                animate={likeControls}
                className="w-64 h-52 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-700/80 p-4 shadow-2xl flex flex-col justify-between cursor-grab active:cursor-grabbing select-none relative overflow-hidden"
              >
                {/* LIKE stamp indicator */}
                <motion.div 
                  style={{ opacity: likeStampOpacity }}
                  className="absolute top-4 right-4 z-20 px-3 py-1 bg-emerald-600 text-white font-black text-xs rounded-lg border border-white/20 uppercase tracking-wider rotate-[12deg] shadow-lg pointer-events-none"
                >
                  LIKE ❤️
                </motion.div>

                {/* Bot Profile Details */}
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-full bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center text-lg">
                    ✨
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <p className="font-bold text-slate-100 text-sm">Priya (Demo Bot), 24</p>
                    </div>
                    <p className="text-[10px] text-slate-400 flex items-center">
                      <Compass className="w-3 h-3 mr-1 text-rose-400" /> 2 km away · Coffee & Travel
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-300 italic bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                  "I already swiped right on you! Swipe right to see what happens 💖"
                </p>

                {/* Practice Action Buttons */}
                <div className="flex items-center justify-center space-x-4 pt-1">
                  <div className="w-10 h-10 rounded-full bg-slate-950/60 border border-slate-700 flex items-center justify-center text-slate-500 opacity-50">
                    <X className="w-5 h-5" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-950/60 border border-slate-700 flex items-center justify-center text-slate-500 opacity-50">
                    <Star className="w-4 h-4" />
                  </div>
                  <button
                    onClick={handleLikeSwipe}
                    className="w-10 h-10 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all shadow-md active:scale-95 animate-bounce"
                    title="Click to Like"
                  >
                    <Heart className="w-5 h-5 fill-emerald-500/20" />
                  </button>
                </div>
              </motion.div>
            </div>
          ) : (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-5 rounded-2xl bg-slate-900/90 border border-rose-500/40 text-center space-y-2.5 max-w-xs shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <PartyPopper className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-gradient bg-clip-text">It's a Mutual Match!</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                When two people swipe right on each other, you match instantly and can start chatting!
              </p>
              <button
                onClick={() => {
                  setCurrentSlide(3);
                  setProgress(0);
                }}
                className="mt-2 w-full py-2 rounded-xl bg-gradient text-white font-bold text-xs shadow-md hover:opacity-95 transition-opacity"
              >
                Continue Tour 👉
              </button>
            </motion.div>
          )}
        </div>
      ),
      tip: 'Swipe Right or tap ❤️ anytime you like a profile!'
    },

    // Slide 3: Daily Free Super Like
    {
      badge: 'Daily Reward',
      title: '1 Free Super Like Daily ⭐',
      subtitle: 'Log in every day to claim 1 free Super Like! Super Likes jump your profile straight to the top of their discovery stack with a glowing golden badge.',
      accentGlow: 'bg-amber-500/20',
      isInteractive: false,
      illustration: (
        <div className="relative w-full max-w-sm mx-auto h-64 flex flex-col justify-center space-y-3 px-2">
          {/* Glowing Super Like Benefit Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-2xl bg-slate-900/95 border border-amber-500/40 shadow-xl space-y-3 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/30">
                  <Star className="w-6 h-6 fill-slate-950" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-100 flex items-center">
                    <span>1 Daily Super Like</span>
                    <Sparkles className="w-3.5 h-3.5 ml-1 text-amber-400" />
                  </h4>
                  <p className="text-[11px] text-amber-400 font-semibold">Active Daily Reward</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-[10px]">
                1 / 1 Today
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center space-x-2.5 text-xs text-slate-300">
              <span className="px-2 py-0.5 rounded-md bg-gradient-to-r from-blue-600 to-amber-500 text-white font-black text-[10px]">
                ⭐ SUPER LIKED YOU!
              </span>
              <span className="text-[11px] text-slate-400">Pushed to top of their feed</span>
            </div>
          </motion.div>

          <p className="text-[11px] text-slate-400 text-center flex items-center justify-center">
            <span>⏰ Only when you log in daily will you receive your free Super Like.</span>
          </p>
        </div>
      ),
      tip: 'Log in daily to claim your free Super Like and triple your match chances!'
    },

    // Slide 4: Real-World Hangouts
    {
      badge: 'Step 3: Local Hangouts',
      title: 'Meet in Real Life via Hangouts',
      subtitle: 'Skip the endless texting. Join or host spontaneous meetups—from coffee catchups and morning jogs to concerts and art nights.',
      accentGlow: 'bg-teal-500/20',
      isInteractive: false,
      illustration: (
        <div className="relative w-full max-w-sm mx-auto h-64 flex flex-col justify-center space-y-3 px-2">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-3 rounded-2xl bg-slate-900/90 border border-teal-500/30 shadow-lg flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-lg">
                ☕
              </div>
              <div>
                <p className="text-xs font-bold text-slate-100">Specialty Coffee Tasting</p>
                <p className="text-[10px] text-teal-400 font-medium">Downtown Café · Today 5:00 PM</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-teal-500 text-slate-950">
              4 Going
            </span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-3 rounded-2xl bg-slate-900/90 border border-purple-500/30 shadow-lg flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-lg">
                🏃
              </div>
              <div>
                <p className="text-xs font-bold text-slate-100">Sunrise Trail Jog</p>
                <p className="text-[10px] text-purple-400 font-medium">City Park · Saturday 7:00 AM</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-purple-500 text-white">
              6 Going
            </span>
          </motion.div>
        </div>
      ),
      tip: 'Tap the Hangouts tab in navigation to browse local activities or create your own!'
    },

    // Slide 5: Matches, Chat & Icebreakers
    {
      badge: 'Step 4: Matches & Chat',
      title: 'Instant Chat, Voice & Calls',
      subtitle: 'When both people like each other, it is a mutual match! Break the ice instantly with pre-made starters, audio messages, and secure calls.',
      accentGlow: 'bg-violet-500/20',
      isInteractive: false,
      illustration: (
        <div className="relative w-full max-w-sm mx-auto h-64 flex flex-col justify-center px-4">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-3">
            <div className="flex items-center space-x-2.5 pb-2.5 border-b border-slate-800">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-violet-500 flex items-center justify-center text-xs text-white font-bold">
                ❤️
              </div>
              <div>
                <p className="text-xs font-bold text-slate-100">Mutual Match!</p>
                <p className="text-[10px] text-slate-400">You and Priya liked each other</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-start">
                <div className="bg-slate-800 text-slate-200 px-3 py-1.5 rounded-2xl rounded-tl-sm max-w-[85%]">
                  "Hey! Loved your prompt about weekend getaways 🚗"
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-rose-600 text-white px-3 py-1.5 rounded-2xl rounded-tr-sm max-w-[85%]">
                  "Hi! Yes! What is your favorite road trip spot? 🌄"
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      tip: 'Check the Matches tab for new mutual likes and ongoing conversations.'
    },

    // Slide 6: Safety & Community Guidelines
    {
      badge: 'Step 5: Safety & Guidelines',
      title: 'Safe, Respectful & Verified',
      subtitle: 'Your security is our top priority. HeartSync is strictly 18+, with active moderation, one-tap block/report tools, and secure messaging.',
      accentGlow: 'bg-emerald-500/20',
      isInteractive: false,
      illustration: (
        <div className="relative w-full max-w-sm mx-auto h-64 flex flex-col justify-center space-y-2.5 px-2">
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100">18+ Verified Platform</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Only authentic adult profiles. Bots and abusive accounts are swiftly filtered.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-rose-500/15 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100">Instant Block & Report</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Access safety tools at any point during swipes or chat to protect your space.
              </p>
            </div>
          </div>
        </div>
      ),
      tip: 'Always meet in public locations for first dates and never share financial details.'
    }
  ];

  // Auto progression timer (only on non-interactive slides or if slide 1/2 already completed)
  useEffect(() => {
    const isInteractiveSlide = slides[currentSlide]?.isInteractive;
    if (isPaused || isInteractiveSlide) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      return;
    }

    const interval = 50;
    const step = (interval / SLIDE_DURATION) * 100;

    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentSlide < slides.length - 1) {
            setCurrentSlide((curr) => curr + 1);
            return 0;
          } else {
            clearInterval(progressTimerRef.current);
            return 100;
          }
        }
        return prev + step;
      });
    }, interval);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [currentSlide, isPaused, slides]);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((curr) => curr + 1);
      setProgress(0);
    } else {
      finishTutorial();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide((curr) => curr - 1);
      setProgress(0);
    }
  };

  const current = slides[currentSlide];
  const isLast = currentSlide === slides.length - 1;

  return (
    <div 
      className="fixed inset-0 bg-slate-950 text-slate-100 flex flex-col justify-between z-50 overflow-hidden select-none"
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Background Ambient Glows */}
      <div className={`absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 ${current.accentGlow} rounded-full blur-[100px] pointer-events-none transition-all duration-700`} />
      <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Header & Story Progress Bars */}
      <div className="relative z-20 pt-4 px-4 max-w-lg mx-auto w-full">
        {/* Progress Bars (Story Style) */}
        <div className="flex items-center space-x-1.5 mb-4">
          {slides.map((_, idx) => (
            <div 
              key={idx} 
              className="h-1 flex-1 bg-slate-800/80 rounded-full overflow-hidden cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentSlide(idx);
                setProgress(0);
              }}
            >
              <div 
                className="h-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-75"
                style={{ 
                  width: idx < currentSlide ? '100%' : idx === currentSlide ? (current.isInteractive ? '100%' : `${progress}%`) : '0%' 
                }}
              />
            </div>
          ))}
        </div>

        {/* Top Navbar items */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-800 text-rose-400">
              {current.badge}
            </span>
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              finishTutorial();
            }}
            className="text-xs font-bold text-slate-400 hover:text-slate-100 bg-slate-900/80 hover:bg-slate-800 px-3.5 py-1.5 rounded-full border border-slate-800 transition-colors"
          >
            Skip
          </button>
        </div>
      </div>

      {/* Main Slide Content Area */}
      <div className="relative z-10 flex-1 max-w-lg mx-auto w-full px-6 flex flex-col justify-center py-2">
        {/* Left / Right Invisible Tap Zones (Disabled on interactive card slides to allow dragging) */}
        {!current.isInteractive && (
          <>
            <div 
              className="absolute inset-y-0 left-0 w-1/4 z-20 cursor-pointer" 
              onClick={handlePrev}
              title="Previous Slide"
            />
            <div 
              className="absolute inset-y-0 right-0 w-1/4 z-20 cursor-pointer" 
              onClick={handleNext}
              title="Next Slide"
            />
          </>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -15 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col items-center text-center space-y-3"
          >
            {/* Visual Illustration / Interactive Component */}
            <div className="w-full">
              {current.illustration}
            </div>

            {/* Title & Description */}
            <div className="space-y-1.5 max-w-md mx-auto">
              <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight leading-snug">
                {current.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
                {current.subtitle}
              </p>
            </div>

            {/* Tip Box */}
            <div className="pt-1">
              <p className="text-[11px] text-slate-500 font-medium bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-full max-w-xs mx-auto">
                💡 {current.tip}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Action Controls */}
      <div className="relative z-30 pb-8 pt-2 px-6 max-w-lg mx-auto w-full flex items-center justify-between space-x-4">
        {currentSlide > 0 ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="flex items-center space-x-1 px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        ) : (
          <div className="w-16" />
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className={`flex-1 py-3.5 px-6 rounded-2xl text-sm font-black flex items-center justify-center space-x-2 transition-all shadow-xl active:scale-95 ${
            isLast
              ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 text-white shadow-rose-500/30'
              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25'
          }`}
        >
          <span>{isLast ? 'Enter HeartSync 🚀' : 'Next'}</span>
          {!isLast && <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
