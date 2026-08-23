import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import {
  Calendar, MapPin, Clock, Plus, Heart, X, User as UserIcon,
  RefreshCw, Map, Sparkles, Coffee
} from 'lucide-react';
import ProfileCardContent from '../components/ProfileCardContent';
import { motion, AnimatePresence } from 'framer-motion';

interface Photo {
  id: string;
  url: string;
  isPrimary: boolean;
}

interface Creator {
  id: string;
  name: string;
  bio: string;
  birthdate: string;
  gender: string;
  photos: Photo[];
}

interface Hangout {
  id: string;
  title: string;
  location: string;
  eventDate: string;
  creator: Creator;
}

function calculateAge(birthdate: string): number {
  const b = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
}

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const isToday = d.toDateString() === today.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) return `Today at ${timeStr}`;
  if (isTomorrow) return `Tomorrow at ${timeStr}`;
  return `${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at ${timeStr}`;
}

const SWIPED_KEY = 'heartsync_swiped_hangouts';

function getSwipedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SWIPED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function markSwiped(id: string) {
  const swiped = getSwipedIds();
  swiped.add(id);
  localStorage.setItem(SWIPED_KEY, JSON.stringify([...swiped]));
}

export default function HangoutsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hangouts, setHangouts] = useState<Hangout[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Profile detail drawer
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [selectedHangout, setSelectedHangout] = useState<Hangout | null>(null);

  // Create Modal state
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [error, setError] = useState('');

  // Match celebration overlay
  const [matchResult, setMatchResult] = useState<{ hangoutTitle: string; creatorName: string; matchId: string } | null>(null);

  // Concept Toaster
  const [showConceptToaster, setShowConceptToaster] = useState(false);

  // Swipe drag state
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const fetchHangouts = async () => {
    setLoading(true);
    try {
      const data = await api.get<Hangout[]>('/hangouts');
      // Filter out already-swiped hangouts
      const swiped = getSwipedIds();
      const unseen = data.filter((h) => !swiped.has(h.id));
      setHangouts(unseen);
      setCurrentIndex(0);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load hangouts');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndReloadHangouts = async () => {
    localStorage.removeItem(SWIPED_KEY);
    setLoading(true);
    try {
      await api.get('/seed?secret=heartsync-seed-2026').catch(() => {});
      await fetchHangouts();
    } catch {
      fetchHangouts();
    }
  };

  useEffect(() => {
    fetchHangouts();
    const userKey = user?.id ? `heartsync_hangouts_toast_v2_${user.id}` : 'heartsync_hangouts_toast_v2';
    const hasSeenConcept = localStorage.getItem(userKey);
    if (!hasSeenConcept) {
      setShowConceptToaster(true);
    }
  }, [user]);

  const dismissToaster = () => {
    setShowConceptToaster(false);
    const userKey = user?.id ? `heartsync_hangouts_toast_v2_${user.id}` : 'heartsync_hangouts_toast_v2';
    localStorage.setItem(userKey, 'true');
  };

  const getPhotoUrl = (url: string) => {
    if (!url) return '';
    return url.startsWith('/uploads') ? `${API_URL.replace('/api', '')}${url}` : url;
  };

  const primaryPhoto = (creator: Creator) => {
    const primary = creator.photos.find(p => p.isPrimary) || creator.photos[0];
    return primary ? getPhotoUrl(primary.url) : null;
  };

  const handlePass = () => {
    const hangout = hangouts[currentIndex];
    if (hangout) markSwiped(hangout.id);
    setDragX(0);
    setCurrentIndex(prev => prev + 1);
  };

  const handleLike = async () => {
    const hangout = hangouts[currentIndex];
    if (!hangout) return;
    markSwiped(hangout.id);
    setDragX(0);
    setCurrentIndex(prev => prev + 1);

    try {
      const res = await api.post<any>(`/hangouts/${hangout.id}/like`, {});
      if (res.matchId) {
        setMatchResult({
          hangoutTitle: hangout.title,
          creatorName: hangout.creator.name,
          matchId: res.matchId,
        });
      }
    } catch (err: any) {
      console.error('[HangoutsPage] Like failed:', err);
    }
  };

  // Touch / Mouse drag handlers
  const onDragStart = (clientX: number) => {
    dragStartX.current = clientX;
    setIsDragging(true);
  };

  const onDragMove = (clientX: number) => {
    if (dragStartX.current === null) return;
    setDragX(clientX - dragStartX.current);
  };

  const onDragEnd = () => {
    const threshold = 100;
    if (dragX > threshold) handleLike();
    else if (dragX < -threshold) handlePass();
    else setDragX(0);
    dragStartX.current = null;
    setIsDragging(false);
  };

  const handleCreateHangout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const datetime = new Date(`${newEventDate}T${newEventTime}`);
      await api.post<Hangout>('/hangouts', {
        title: newTitle,
        location: newLocation,
        eventDate: datetime.toISOString(),
      });

      setCreateSuccess(true);
      setTimeout(() => {
        setShowModal(false);
        setCreateSuccess(false);
        setNewTitle('');
        setNewLocation('');
        setNewEventDate('');
        setNewEventTime('');
        fetchHangouts();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to post hangout');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentHangout = hangouts[currentIndex];
  const isDone = !loading && (hangouts.length === 0 || currentIndex >= hangouts.length);

  // Swipe card rotation based on drag
  const rotation = isDragging ? dragX * 0.07 : 0;
  const likeOpacity = Math.max(0, Math.min(1, dragX / 80));
  const passOpacity = Math.max(0, Math.min(1, -dragX / 80));

  return (
    <Layout>
      <div className="flex flex-col items-center w-full max-w-sm mx-auto pb-8">
        {/* Header */}
        <div className="w-full flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-100 flex items-center space-x-2">
              <Map className="w-6 h-6 text-rose-500" />
              <span>Hangouts</span>
              <button
                onClick={() => setShowConceptToaster(true)}
                className="p-1 rounded-full text-slate-400 hover:text-teal-400 hover:bg-slate-800 transition-colors"
                title="What are Hangouts?"
              >
                <Sparkles className="w-4 h-4 text-teal-400" />
              </button>
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">Real-world meetup events</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-full text-xs font-bold shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Post Event</span>
          </button>
        </div>

        {error && error !== 'Profile not found' && (
          <p className="text-rose-400 text-sm mb-4 bg-rose-950/20 p-3 rounded-lg border border-rose-900/50 w-full">{error}</p>
        )}

        {/* Swipe Deck Area */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <RefreshCw className="w-10 h-10 text-rose-500 animate-spin" />
            <p className="text-slate-400 text-sm">Loading hangouts...</p>
          </div>
        ) : error === 'Profile not found' ? (
          <div className="text-center py-16 glass rounded-3xl border border-slate-800 w-full px-6">
            <UserIcon className="w-16 h-16 text-rose-500/80 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-200">Profile Required</h3>
            <p className="text-slate-400 mt-2 text-sm max-w-xs mx-auto">
              Please complete your dating profile first so we can match you with relevant hangouts and people nearby.
            </p>
            <button
              onClick={() => navigate('/onboarding')}
              className="mt-6 px-6 py-2.5 rounded-full bg-gradient text-white text-sm font-bold shadow-lg shadow-rose-500/30 hover:opacity-95 transition-all"
            >
              Complete Profile
            </button>
          </div>
        ) : isDone ? (
          <div className="text-center py-16 glass rounded-3xl border border-slate-800 w-full px-6">
            <Calendar className="w-16 h-16 text-rose-500/40 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-200">No more hangouts!</h3>
            <p className="text-slate-400 mt-2 text-sm max-w-xs mx-auto">
              You've explored all current events. Post your own hangout or reload active demo meetups!
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setShowModal(true)}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-2.5 rounded-full bg-gradient text-white text-sm font-bold shadow-lg shadow-rose-500/25 hover:opacity-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Post a Hangout</span>
              </button>
              <button
                onClick={handleResetAndReloadHangouts}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-sm font-semibold transition-colors"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Reload Demo Hangouts</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Card Counter */}
            <div className="flex items-center space-x-1 mb-3 self-end">
              {hangouts.slice(currentIndex, currentIndex + 5).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === 0 ? 'w-5 bg-rose-500' : 'w-1.5 bg-slate-700'}`}
                />
              ))}
            </div>

            {/* Swipe Card */}
            <div className="relative w-full select-none" style={{ touchAction: 'none' }}>
              {/* Background stacked cards for depth */}
              {hangouts[currentIndex + 1] && (
                <div className="absolute inset-0 top-2 scale-[0.96] rounded-3xl glass border border-slate-800 opacity-60 pointer-events-none" />
              )}
              {hangouts[currentIndex + 2] && (
                <div className="absolute inset-0 top-4 scale-[0.92] rounded-3xl glass border border-slate-800 opacity-30 pointer-events-none" />
              )}

              {/* Main Card */}
              <div
                className={`relative rounded-3xl overflow-hidden shadow-2xl glass border border-slate-800 cursor-grab active:cursor-grabbing transition-shadow ${isDragging ? 'shadow-rose-500/10' : ''}`}
                style={{
                  transform: `translateX(${dragX}px) rotate(${rotation}deg)`,
                  transition: isDragging ? 'none' : 'transform 0.3s ease',
                  aspectRatio: '3/4',
                }}
                onMouseDown={(e) => onDragStart(e.clientX)}
                onMouseMove={(e) => isDragging && onDragMove(e.clientX)}
                onMouseUp={() => isDragging && onDragEnd()}
                onMouseLeave={() => isDragging && onDragEnd()}
                onTouchStart={(e) => onDragStart(e.touches[0].clientX)}
                onTouchMove={(e) => onDragMove(e.touches[0].clientX)}
                onTouchEnd={() => onDragEnd()}
              >
                {/* Full-bleed Profile Photo */}
                {primaryPhoto(currentHangout.creator) ? (
                  <img
                    src={primaryPhoto(currentHangout.creator)!}
                    alt={currentHangout.creator.name}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    draggable={false}
                  />
                ) : (
                  <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                    <UserIcon className="w-24 h-24 text-slate-700" />
                  </div>
                )}

                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent pointer-events-none" />

                {/* Like / Pass Indicators */}
                <div
                  className="absolute top-8 left-6 px-4 py-2 rounded-xl border-2 border-emerald-500 text-emerald-400 font-black text-xl tracking-widest rotate-[-12deg] pointer-events-none transition-opacity"
                  style={{ opacity: likeOpacity }}
                >
                  JOIN!
                </div>
                <div
                  className="absolute top-8 right-6 px-4 py-2 rounded-xl border-2 border-rose-500 text-rose-400 font-black text-xl tracking-widest rotate-[12deg] pointer-events-none transition-opacity"
                  style={{ opacity: passOpacity }}
                >
                  PASS
                </div>

                {/* Event Banner */}
                <div className="absolute top-5 left-0 right-0 flex justify-center z-10 pointer-events-none">
                  <div className="bg-slate-950/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl px-4 py-2 max-w-[85%]">
                    <p className="text-white font-bold text-sm text-center leading-snug">{currentHangout.title}</p>
                    <div className="flex items-center justify-center space-x-3 mt-1">
                      <span className="flex items-center space-x-1 text-[10px] text-rose-400">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[120px]">{currentHangout.location}</span>
                      </span>
                      <span className="flex items-center space-x-1 text-[10px] text-emerald-400">
                        <Clock className="w-3 h-3" />
                        <span>{formatEventDate(currentHangout.eventDate)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Profile Info at Bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
                  {/* Tap to view profile */}
                  <button
                    className="flex items-end space-x-3 w-full text-left mb-5 group"
                    onClick={() => {
                      setSelectedCreator(currentHangout.creator);
                      setSelectedHangout(currentHangout);
                    }}
                  >
                    <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-rose-500/60 shadow-lg">
                      {primaryPhoto(currentHangout.creator) ? (
                        <img src={primaryPhoto(currentHangout.creator)!} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                          <UserIcon className="w-6 h-6 text-slate-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold text-white">
                          {currentHangout.creator.name}
                        </span>
                        {currentHangout.creator.birthdate && (
                          <span className="text-slate-400 font-normal text-base">
                            {calculateAge(currentHangout.creator.birthdate)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1 leading-snug mt-0.5">
                        {currentHangout.creator.bio || 'Tap to view profile'}
                      </p>
                      <span className="text-[10px] text-rose-400 underline underline-offset-2 group-hover:text-rose-300 transition-colors mt-0.5 inline-block">
                        View profile →
                      </span>
                    </div>
                  </button>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-center space-x-6">
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={handlePass}
                      className="w-14 h-14 rounded-full bg-slate-900/80 border border-slate-700 backdrop-blur-sm flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-500/50 hover:shadow-[0_0_20px_rgba(244,63,94,0.2)] transition-all duration-300"
                    >
                      <X className="w-6 h-6" />
                    </button>
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={handleLike}
                      className="w-16 h-16 rounded-full bg-rose-600 flex items-center justify-center text-white shadow-lg hover:bg-rose-500 hover:shadow-[0_0_30px_rgba(244,63,94,0.5)] transition-all duration-300"
                    >
                      <Heart className="w-7 h-7 fill-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Profile Detail Drawer / Sheet */}
      {selectedCreator && selectedHangout && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-sm" onClick={() => setSelectedCreator(null)}>
          <div
            className="glass w-full max-w-lg rounded-t-3xl border border-slate-800 overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full relative h-[70vh] overflow-y-auto scrollbar-hide pb-28">
              <ProfileCardContent candidate={selectedCreator as any} />
            </div>

            {/* CTA Buttons */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent z-30 flex items-center justify-center space-x-6">
              <button
                onClick={() => setSelectedCreator(null)}
                className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-500/50 transition-all transform hover:scale-105"
              >
                <X className="w-6 h-6" />
              </button>
              <button
                onClick={async () => {
                  setSelectedCreator(null);
                  await handleLike();
                }}
                className="w-16 h-16 rounded-full bg-rose-600 flex items-center justify-center text-white shadow-lg hover:bg-rose-500 transition-all transform hover:scale-105"
              >
                <Heart className="w-7 h-7 fill-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match Celebration Overlay */}
      {matchResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="max-w-sm w-full text-center">
            <div className="text-5xl mb-3">🎉</div>
            <h1 className="text-4xl font-black text-gradient bg-clip-text">It's a Match!</h1>
            <p className="text-slate-300 text-sm mt-3 leading-relaxed">
              You and <strong className="text-white">{matchResult.creatorName}</strong> are connected.<br />
              You can now coordinate joining <em>"{matchResult.hangoutTitle}"</em> in chat.
            </p>
            <div className="space-y-3 mt-8">
              <button
                onClick={() => {
                  setMatchResult(null);
                  navigate('/chat');
                }}
                className="w-full py-3 rounded-full bg-gradient text-white font-bold shadow-lg shadow-rose-500/30 hover:opacity-90 transition-opacity text-sm"
              >
                Send a Message
              </button>
              <button
                onClick={() => setMatchResult(null)}
                className="w-full py-3 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-sm font-bold transition-colors"
              >
                Keep Browsing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass max-w-md w-full rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-rose-500" />
                <span>Post a Hangout</span>
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              {createSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Heart className="w-8 h-8 fill-emerald-500" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-200">Hangout Posted!</h3>
                  <p className="text-slate-400 text-sm mt-2">Get ready to meet someone new.</p>
                </div>
              ) : (
                <form onSubmit={handleCreateHangout} className="space-y-4">
                  {error && <p className="text-rose-400 text-xs bg-rose-950/20 p-2 rounded-lg">{error}</p>}

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">What are we doing?</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Going for a movie, Coffee tasting"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Where?</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Palakkad Aroma Theatre"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Date</label>
                      <input
                        type="date"
                        required
                        min={new Date().toISOString().split('T')[0]}
                        value={newEventDate}
                        onChange={(e) => setNewEventDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Time</label>
                      <input
                        type="time"
                        required
                        value={newEventTime}
                        onChange={(e) => setNewEventTime(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800 transition-colors"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-gradient text-white disabled:opacity-50 shadow-md"
                    >
                      {isSubmitting ? 'Posting...' : 'Post Hangout'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hangouts Concept Toaster */}
      <AnimatePresence>
        {showConceptToaster && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 md:bottom-8 left-4 right-4 md:left-auto md:right-8 md:w-96 z-[70] glass bg-slate-950/95 border border-teal-500/50 rounded-3xl p-5 shadow-[0_10px_40px_rgba(20,184,166,0.3)] backdrop-blur-xl"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg">
                  <Map className="w-6 h-6 text-slate-950" />
                </div>
                <div>
                  <h3 className="text-slate-100 font-bold text-base flex items-center">
                    <span>Explore Hangouts</span>
                    <Sparkles className="w-4 h-4 ml-1.5 text-amber-400" />
                  </h3>
                  <p className="text-[11px] text-teal-400 font-semibold">Real-world meetups & dates</p>
                </div>
              </div>
              <button 
                onClick={dismissToaster} 
                className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-300 text-xs mt-3.5 leading-relaxed">
              Hangouts are casual, spontaneous meetups. Swipe right on activities you'd like to join—like grabbing coffee, concerts, or hiking—or post your own hangout!
            </p>

            <div className="mt-4 flex items-center space-x-2">
              <button
                onClick={dismissToaster}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md active:scale-95 flex items-center justify-center space-x-1"
              >
                <Coffee className="w-3.5 h-3.5 mr-1" />
                <span>Got it, let's explore!</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
