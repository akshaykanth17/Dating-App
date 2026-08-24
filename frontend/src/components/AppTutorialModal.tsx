import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  X, 
  Star, 
  Flame, 
  Map, 
  MessageSquare, 
  ShieldCheck, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  Compass, 
  ShieldAlert,
  PartyPopper,
  ArrowRight,
  ArrowLeft,
  Layers,
  Coffee,
  Activity,
  Lock,
  Mic
} from 'lucide-react';

interface AppTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

export default function AppTutorialModal({ isOpen, onClose, userName }: AppTutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [demoSwipeAction, setDemoSwipeAction] = useState<'LIKE' | 'PASS' | 'SUPER' | null>(null);

  // Reset step when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setDemoSwipeAction(null);
    }
  }, [isOpen]);

  const steps = [
    // Step 0: Welcome & Setup Complete
    {
      title: userName ? `Welcome aboard, ${userName}!` : 'Welcome to TapIn!',
      subtitle: 'Your profile is live and ready',
      icon: Sparkles,
      iconBg: 'from-amber-500 to-rose-500',
      content: (
        <div className="space-y-4 text-center">
          <div className="relative mx-auto w-24 h-24 mb-2 flex items-center justify-center">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-2 border-dashed border-rose-500/40"
            />
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="w-20 h-20 rounded-full bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.4)]"
            >
              <Flame className="w-10 h-10 text-white fill-white" />
            </motion.div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-100">You're Ready to Connect</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
              We've curated nearby people who share your vibe and interests. Take a quick 30-second tour to discover all of TapIn's features!
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 max-w-xs mx-auto">
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
              <Flame className="w-5 h-5 text-rose-500 mx-auto mb-1" />
              <span className="text-[11px] font-semibold text-slate-300 block">Smart Match</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
              <Map className="w-5 h-5 text-teal-400 mx-auto mb-1" />
              <span className="text-[11px] font-semibold text-slate-300 block">Hangouts</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
              <span className="text-[11px] font-semibold text-slate-300 block">18+ Safe</span>
            </div>
          </div>
        </div>
      ),
    },

    // Step 1: Discover & Swiping Gestures
    {
      title: 'Discover & Swipe',
      subtitle: 'Simple gestures to find your match',
      icon: Flame,
      iconBg: 'from-rose-500 to-pink-600',
      content: (
        <div className="space-y-4">
          {/* Interactive Mini Demo Card */}
          <div className="relative mx-auto w-full max-w-[280px] h-48 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/80 p-3.5 flex flex-col justify-between overflow-hidden shadow-lg">
            {/* Action overlay badges */}
            <AnimatePresence>
              {demoSwipeAction === 'LIKE' && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute top-4 right-4 z-20 px-3 py-1 bg-emerald-500 text-white font-extrabold text-xs rounded-lg shadow-lg border border-white/20 uppercase tracking-wider flex items-center space-x-1"
                >
                  <Heart className="w-3.5 h-3.5 fill-white" />
                  <span>Liked!</span>
                </motion.div>
              )}
              {demoSwipeAction === 'PASS' && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute top-4 left-4 z-20 px-3 py-1 bg-rose-500 text-white font-extrabold text-xs rounded-lg shadow-lg border border-white/20 uppercase tracking-wider flex items-center space-x-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Passed</span>
                </motion.div>
              )}
              {demoSwipeAction === 'SUPER' && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1 bg-amber-500 text-white font-extrabold text-xs rounded-lg shadow-lg border border-white/20 uppercase tracking-wider flex items-center space-x-1"
                >
                  <Star className="w-3.5 h-3.5 fill-white" />
                  <span>Super Liked!</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold text-lg">
                <Sparkles className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <p className="font-bold text-slate-100 text-sm">Sample Profile, 24</p>
                <p className="text-[11px] text-slate-400 flex items-center">
                  <Compass className="w-3 h-3 mr-1 text-rose-400" /> 2 km away · Coffee & Art
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 italic bg-slate-950/60 p-2 rounded-lg border border-slate-800">
              "Looking for someone who loves spontaneous weekend road trips"
            </p>

            {/* Interactive Demo Buttons */}
            <div className="flex items-center justify-center space-x-3 pt-1">
              <button 
                onClick={() => setDemoSwipeAction('PASS')}
                className="w-10 h-10 rounded-full bg-slate-950/90 border border-rose-500/40 flex items-center justify-center text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all shadow-md"
                title="Pass (Swipe Left)"
              >
                <X className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setDemoSwipeAction('SUPER')}
                className="w-8 h-8 rounded-full bg-slate-950/90 border border-amber-500/40 flex items-center justify-center text-amber-400 hover:bg-amber-500/20 active:scale-95 transition-all shadow-md"
                title="Super Like"
              >
                <Star className="w-4 h-4 fill-amber-400/20" />
              </button>
              <button 
                onClick={() => setDemoSwipeAction('LIKE')}
                className="w-10 h-10 rounded-full bg-slate-950/90 border border-emerald-500/40 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all shadow-md"
                title="Like (Swipe Right)"
              >
                <Heart className="w-5 h-5 fill-emerald-500/20" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                <ArrowRight className="w-3 h-3" />
              </span>
              <span><strong>Swipe Right:</strong> Like a profile. If they like you back, it's a match!</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px] font-bold">
                <ArrowLeft className="w-3 h-3" />
              </span>
              <span><strong>Swipe Left:</strong> Pass to see the next person in your area.</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-bold">
                <Layers className="w-3 h-3" />
              </span>
              <span><strong>Tap & Scroll:</strong> View all photos, lifestyle habits, and prompt answers.</span>
            </div>
          </div>
        </div>
      ),
    },

    // Step 2: Hangouts & Real-world Meetups
    {
      title: 'Local Hangouts',
      subtitle: 'Spontaneous activities & real meetups',
      icon: Map,
      iconBg: 'from-teal-500 to-emerald-600',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center space-x-1">
                  <Coffee className="w-3.5 h-3.5 text-amber-400 mr-1" />
                  <span>Coffee & Chat</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-400 font-semibold">Today</span>
              </div>
              <p className="text-[11px] text-slate-400">"Trying the new specialty brew downtown!"</p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-500">3 joined</span>
                <span className="text-[10px] text-teal-400 font-semibold">RSVP open</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center space-x-1">
                  <Activity className="w-3.5 h-3.5 text-teal-400 mr-1" />
                  <span>Weekend Trail</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-semibold">Sat</span>
              </div>
              <p className="text-[11px] text-slate-400">"5km sunrise run followed by smoothies."</p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-500">5 joined</span>
                <span className="text-[10px] text-purple-400 font-semibold">RSVP open</span>
              </div>
            </div>
          </div>

          <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-3 space-y-1">
            <p className="text-xs font-semibold text-teal-300 flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Skip the endless small talk
            </p>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Explore the <strong>Hangouts</strong> tab to RSVP to community meetups or host your own coffee catchup, gym session, or dinner date!
            </p>
          </div>
        </div>
      ),
    },

    // Step 3: Matches & Real-Time Chat
    {
      title: 'Matches & Instant Chat',
      subtitle: 'Connect, icebreak, voice & video calls',
      icon: MessageSquare,
      iconBg: 'from-violet-500 to-indigo-600',
      content: (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center space-x-3 pb-2 border-b border-slate-800">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-violet-500 flex items-center justify-center font-bold text-xs text-white">
                <Heart className="w-4 h-4 fill-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-100">Mutual Match!</p>
                <p className="text-[10px] text-slate-400">You and Priya liked each other</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-start">
                <div className="bg-slate-800 text-slate-200 text-xs px-3 py-1.5 rounded-2xl rounded-tl-sm max-w-[80%]">
                  Hey! I saw you love photography too
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-rose-600 text-white text-xs px-3 py-1.5 rounded-2xl rounded-tr-sm max-w-[80%]">
                  Yes! Always hunting for great sunrise spots
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div className="flex items-center space-x-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span><strong>Icebreakers:</strong> Fun prompt cards to start chat.</span>
            </div>
            <div className="flex items-center space-x-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
              <Mic className="w-4 h-4 text-violet-400 flex-shrink-0" />
              <span><strong>Voice Notes:</strong> Send quick audio messages anytime.</span>
            </div>
          </div>
        </div>
      ),
    },

    // Step 4: Safety & Verified Community
    {
      title: 'Safety & Respect',
      subtitle: 'Your security and peace of mind come first',
      icon: ShieldCheck,
      iconBg: 'from-emerald-500 to-cyan-600',
      content: (
        <div className="space-y-3.5">
          <div className="grid grid-cols-1 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100">18+ Verified Platform</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Only authentic, verified adult users. Strict moderation against fake or abusive accounts.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 mt-0.5">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100">Instant Block & Report</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Easily block or report any profile or conversation from the safety menu at any time.
                </p>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 text-center">
            <p className="text-[11px] text-slate-400 flex items-center justify-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400 inline mr-1" />
              <span>Always meet in public places and never share sensitive financial details.</span>
            </p>
          </div>
        </div>
      ),
    },
  ];

  if (!isOpen) return null;

  const stepData = steps[currentStep];
  const StepIcon = stepData.icon;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      setCurrentStep(prev => prev + 1);
      setDemoSwipeAction(null);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setDemoSwipeAction(null);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="relative w-full max-w-lg bg-slate-950/95 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden z-10"
        >
          {/* Subtle Ambient Background Glow */}
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors z-20"
            title="Skip Tutorial"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Step Header */}
          <div className="flex items-center space-x-3 mb-5 relative z-10">
            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${stepData.iconBg} flex items-center justify-center shadow-md flex-shrink-0`}>
              <StepIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
                  Step {currentStep + 1} of {steps.length}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-100">{stepData.title}</h2>
              <p className="text-xs text-slate-400">{stepData.subtitle}</p>
            </div>
          </div>

          {/* Step Content Area */}
          <div className="min-h-[260px] flex flex-col justify-center my-2 relative z-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {stepData.content}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Progress Indicators */}
          <div className="flex items-center justify-center space-x-2 my-5 relative z-10">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentStep(idx);
                  setDemoSwipeAction(null);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? 'w-7 bg-gradient-to-r from-rose-500 to-pink-500'
                    : idx < currentStep
                    ? 'w-2 bg-rose-500/50'
                    : 'w-2 bg-slate-800'
                }`}
                title={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-900 relative z-10">
            {currentStep > 0 ? (
              <button
                onClick={handleBack}
                className="flex items-center space-x-1 px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors"
              >
                Skip Tour
              </button>
            )}

            <button
              onClick={handleNext}
              className={`flex items-center space-x-1.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 ${
                isLastStep
                  ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 text-white shadow-rose-500/25'
                  : 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
              }`}
            >
              <span>{isLastStep ? 'Start Connecting!' : 'Next'}</span>
              {isLastStep ? <PartyPopper className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
