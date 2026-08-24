import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Camera, ChevronRight, ChevronLeft, MapPin, Heart, User, Calendar, Check, Loader2, AlertCircle, X, Search, Globe, Pencil } from 'lucide-react';
import { reverseGeocode } from '../utils/location';
import LocationPickerModal, { POPULAR_CITIES } from '../components/LocationPickerModal';

const STEPS = ['About You', 'Location', 'Preferences', 'Details', 'Your Photo'];

const INTEREST_OPTIONS = [
  'Movies', 'Coffee', 'Hiking', 'Photography', 'Foodie', 'Travel', 
  'Reading', 'Music', 'Gaming', 'Fitness', 'Art', 'Dancing', 
  'Cooking', 'Fashion', 'Pets', 'Sports', 'Technology', 'Yoga', 'Anime', 'Board Games'
];

function calculateAge(birthdate: string): number {
  const b = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
}

function getMaxBirthdate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().split('T')[0];
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, setOnboarded } = useAuth();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1 — About You
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('');
  const [bio, setBio] = useState('');
  const [ageError, setAgeError] = useState('');

  // Step 2 — Location
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Step 3 — Preferences
  const [gendersInterestedIn, setGendersInterestedIn] = useState<string[]>([]);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(50);

  // Step 4 — Details
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState('');
  const [prompts, setPrompts] = useState<{ question: string; answer: string }[]>([{ question: 'First date will be like...', answer: '' }]);
  const [favoriteSpot, setFavoriteSpot] = useState('');
  const [job, setJob] = useState('');
  const [education, setEducation] = useState('');
  const [drinking, setDrinking] = useState('');
  const [smoking, setSmoking] = useState('');
  const [gym, setGym] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  // Step 5 — Photo
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill existing profile data if the user previously started onboarding but didn't finish
  useEffect(() => {
    if (user?.profile) {
      const p = user.profile as any;
      if (p.name) setName(p.name);
      if (p.birthdate) setBirthdate(new Date(p.birthdate).toISOString().split('T')[0]);
      if (p.gender) setGender(p.gender);
      if (p.bio) setBio(p.bio);
      if (p.latitude !== undefined) setLatitude(p.latitude);
      if (p.longitude !== undefined) setLongitude(p.longitude);
      if (p.gendersInterestedIn?.length) setGendersInterestedIn(p.gendersInterestedIn);
      if (p.ageInterestedInMin) setAgeMin(p.ageInterestedInMin);
      if (p.ageInterestedInMax) setAgeMax(p.ageInterestedInMax);
      
      if (p.interests?.length) setInterests(p.interests);
      if (p.prompts?.length) setPrompts(p.prompts);
      if (p.favoriteSpot) setFavoriteSpot(p.favoriteSpot);
      if (p.job) setJob(p.job);
      if (p.education) setEducation(p.education);
      if (p.drinking) setDrinking(p.drinking);
      if (p.smoking) setSmoking(p.smoking);
      if (p.gym) setGym(p.gym);
      if (p.height) setHeight(p.height.toString());
      if (p.weight) setWeight(p.weight.toString());

      if (p.photos && p.photos.length > 0) {
        setPhotoPreview(p.photos[0].url);
        setPhotoUploaded(true);
      }
    }
  }, [user]);

  const handleBirthdateChange = (val: string) => {
    setBirthdate(val);
    if (val) {
      const age = calculateAge(val);
      if (age < 18) {
        setAgeError('You must be at least 18 years old to use TapIn.');
      } else {
        setAgeError('');
      }
    }
  };

  const detectLocation = () => {
    setLocationLoading(true);
    setLocationStatus('Detecting your location...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        const locName = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        setLocationStatus(locName);
        setLocationLoading(false);
      },
      async () => {
        const defaultLat = 28.6139;
        const defaultLon = 77.209;
        setLatitude(defaultLat);
        setLongitude(defaultLon);
        const locName = await reverseGeocode(defaultLat, defaultLon);
        setLocationStatus(`${locName} (Default)`);
        setLocationLoading(false);
      },
      { timeout: 10000 }
    );
  };

  useEffect(() => {
    if (step === 1 && latitude === null) {
      detectLocation();
    }
  }, [step]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const originalFile = e.target.files?.[0];
    if (!originalFile) return;
    
    setError('');
    let file = originalFile;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    // Handle HEIC/HEIF format conversions for Apple devices
    if (ext === 'heic' || ext === 'heif') {
      try {
        setLoading(true);
        // We dynamically import heic2any so it's not in the main bundle unless needed
        const heic2any = (await import('heic2any')).default;
        const convertedBlob = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.8
        });
        const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
        file = new File([finalBlob], newName, { type: 'image/jpeg' });
      } catch (err) {
        console.error("HEIC conversion error:", err);
        setError("Failed to process HEIC file. Please try another image.");
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    } else if (!file.type || !file.type.startsWith('image/')) {
      // Sometimes Windows or certain browsers fail to set the file.type properly.
      // If it's not an image type, try to infer it from the extension.
      if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        setError('Please select a valid image file (JPG, PNG, GIF, WEBP, HEIC).');
        return;
      }
      // Recreate the file with the correct mimetype so previews and backend checks work
      const type = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
      file = new File([originalFile], originalFile.name, { type });
    }

    setPhotoFile(file);
    setPhotoUploaded(false);
    
    // Use FileReader for a more robust preview (fixes Blob URL issues)
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.onerror = () => {
      setError('Failed to read the image file for preview.');
    };
    reader.readAsDataURL(file);
  };

  const toggleGender = (g: string) => {
    setGendersInterestedIn(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
    );
  };

  const validateStep = () => {
    setError('');
    if (step === 0) {
      if (!name.trim()) return 'Please enter your name.';
      if (!birthdate) return 'Please enter your date of birth.';
      if (ageError) return ageError;
      if (!gender) return 'Please select your gender.';
    }
    if (step === 1) {
      if (latitude === null || longitude === null) return 'Location is required.';
    }
    if (step === 2) {
      if (gendersInterestedIn.length === 0) return 'Please select at least one preference.';
    }
    return null;
  };

  const handleNext = async () => {
    const err = validateStep();
    if (err) { setError(err); return; }

    if (step === 3) {
      // Save profile to backend before going to photo step
      setLoading(true);
      try {
        await api.post('/onboarding/profile', {
          name,
          birthdate,
          gender,
          bio,
          latitude,
          longitude,
          gendersInterestedIn,
          ageInterestedInMin: ageMin,
          ageInterestedInMax: ageMax,
          interests,
          prompts: prompts.filter(p => p.question.trim() && p.answer.trim()),
          favoriteSpot,
          job,
          education,
          drinking,
          smoking,
          gym,
          height: height ? Number(height) : undefined,
          weight: weight ? Number(weight) : undefined,
        });
      } catch (err: any) {
        setError(err.message || 'Failed to save profile');
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    setStep(prev => prev + 1);
  };

  const handleUploadPhoto = async () => {
    if (!photoFile) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('photo', photoFile);
      await api.upload('/onboarding/photo', formData);
      setPhotoUploaded(true);
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!photoUploaded) {
      setError('Please upload your photo first.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/onboarding/complete', {});
      setOnboarded(true);
      navigate('/tutorial');
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  const progress = ((step) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 mb-2">
            <Heart className="w-7 h-7 text-rose-500 fill-rose-500" />
            <span className="text-2xl font-black text-white tracking-tight">TapIn</span>
          </div>
          <p className="text-rose-400 font-medium text-sm mb-1">Tap into real connections.</p>
          <p className="text-slate-400 text-sm">Let's set up your profile</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-500 mb-2">
            {STEPS.map((s, i) => (
              <span key={s} className={i <= step ? 'text-rose-400 font-semibold' : ''}>{s}</span>
            ))}
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-600 to-pink-500 rounded-full transition-all duration-500"
              style={{ width: `${progress + 25}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl border border-slate-800 p-6 shadow-2xl">
          {error && (
            <div className="flex items-start space-x-2 bg-rose-950/30 border border-rose-800/50 rounded-xl p-3 mb-4">
              <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
              <p className="text-rose-400 text-sm">{error}</p>
            </div>
          )}

          {/* ── STEP 0: About You ── */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <User className="w-5 h-5 text-rose-500" />
                <h2 className="text-xl font-bold text-white">About You</h2>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Your Name</label>
                <input
                  type="text"
                  placeholder="What should we call you?"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  <Calendar className="w-3.5 h-3.5 inline mr-1" />Date of Birth
                </label>
                <input
                  type="date"
                  max={getMaxBirthdate()}
                  value={birthdate}
                  onChange={e => handleBirthdateChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                {ageError && <p className="text-rose-400 text-xs mt-1.5">{ageError}</p>}
                {birthdate && !ageError && (
                  <p className="text-emerald-400 text-xs mt-1.5 flex items-center space-x-1">
                    <Check className="w-3.5 h-3.5 inline mr-1" />
                    <span>Age verified — you're {calculateAge(birthdate)}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Gender</label>
                <div className="grid grid-cols-3 gap-2">
                  {['male', 'female', 'other'].map(g => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className={`py-2.5 rounded-xl text-sm font-semibold capitalize border transition-all ${
                        gender === g
                          ? 'bg-rose-600 border-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Bio <span className="text-slate-600 font-normal">(optional)</span></label>
                <textarea
                  rows={3}
                  placeholder="Tell others something interesting about yourself..."
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* ── STEP 1: Location ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-2">
                <MapPin className="w-5 h-5 text-rose-500" />
                <h2 className="text-xl font-bold text-white">Your Location</h2>
              </div>
              <p className="text-slate-400 text-sm">We use your location to show you people and hangouts nearby.</p>

              {/* Tappable Selected Location Box */}
              <div
                onClick={() => setShowLocationModal(true)}
                className={`rounded-2xl border p-4 text-left transition-all cursor-pointer group shadow-md ${
                  latitude
                    ? 'border-emerald-500/50 bg-emerald-950/20 hover:border-emerald-500'
                    : 'border-slate-700 bg-slate-900/60 hover:border-rose-500/60'
                }`}
              >
                {locationLoading ? (
                  <div className="flex items-center space-x-3 py-2 justify-center">
                    <Loader2 className="w-6 h-6 text-rose-500 animate-spin" />
                    <p className="text-slate-300 text-sm font-medium">Detecting location...</p>
                  </div>
                ) : latitude ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-9 h-9 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Check className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Current Location</p>
                        <p className="text-sm font-bold text-slate-100 truncate">{locationStatus || 'Location Selected'}</p>
                      </div>
                    </div>
                    <span className="text-xs text-rose-400 font-bold group-hover:underline flex-shrink-0 ml-2 flex items-center space-x-1">
                      <span>Change</span>
                      <Pencil className="w-2.5 h-2.5" />
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-rose-400 transition-colors">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-200">No Location Selected</p>
                        <p className="text-xs text-slate-400">Tap to search city or use GPS</p>
                      </div>
                    </div>
                    <span className="text-xs text-rose-400 font-bold group-hover:underline">Select →</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={locationLoading}
                  className="py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-900/80 text-slate-300 text-xs font-semibold hover:bg-slate-800 hover:text-white transition-colors flex items-center justify-center space-x-1.5"
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>Auto GPS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLocationModal(true)}
                  className="py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-900/80 text-slate-300 text-xs font-semibold hover:bg-slate-800 hover:text-white transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Search className="w-3.5 h-3.5 text-rose-500" />
                  <span>Search City</span>
                </button>
              </div>

              {/* Popular Quick Picks */}
              <div className="pt-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Quick Pick Popular Cities</span>
                  <Globe className="w-3 h-3 text-slate-500" />
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_CITIES.slice(0, 8).map((city, idx) => {
                    const isSelected = latitude && Math.abs(latitude - city.lat) < 0.05;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setLatitude(city.lat);
                          setLongitude(city.lng);
                          setLocationStatus(`${city.name}, ${city.state}`);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center space-x-1 ${
                          isSelected
                            ? 'bg-rose-600 border-rose-500 text-white shadow-md'
                            : 'bg-slate-900/70 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        <MapPin className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-rose-400'}`} />
                        <span>{city.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Preferences ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center space-x-2 mb-4">
                <Heart className="w-5 h-5 text-rose-500" />
                <h2 className="text-xl font-bold text-white">Who are you looking for?</h2>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Interested in</label>
                <div className="grid grid-cols-3 gap-2">
                  {['male', 'female', 'other'].map(g => (
                    <button
                      key={g}
                      onClick={() => toggleGender(g)}
                      className={`py-2.5 rounded-xl text-sm font-semibold capitalize border transition-all ${
                        gendersInterestedIn.includes(g)
                          ? 'bg-rose-600 border-rose-500 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {g === 'male' ? 'Men' : g === 'female' ? 'Women' : 'Other'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
                  Age range: <span className="text-rose-400">{ageMin} – {ageMax}</span>
                </label>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Min age: {ageMin}</span>
                    </div>
                    <input type="range" min={18} max={ageMax - 1} value={ageMin}
                      onChange={e => setAgeMin(Number(e.target.value))}
                      className="w-full accent-rose-500" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Max age: {ageMax}</span>
                    </div>
                    <input type="range" min={ageMin + 1} max={80} value={ageMax}
                      onChange={e => setAgeMax(Number(e.target.value))}
                      className="w-full accent-rose-500" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Details ── */}
          {step === 3 && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="flex items-center space-x-2 mb-4">
                <User className="w-5 h-5 text-rose-500" />
                <h2 className="text-xl font-bold text-white">More Details</h2>
              </div>
              <p className="text-slate-400 text-xs mb-4">Filling these out increases your profile completion!</p>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Interests</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {interests.map((interest, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold flex items-center space-x-1">
                      <span>{interest}</span>
                      <button type="button" onClick={() => setInterests(interests.filter((_, i) => i !== idx))} className="text-slate-500 hover:text-rose-400 ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type to search interests (e.g. Movies)..."
                    value={interestInput}
                    onChange={e => setInterestInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (interestInput.trim() && !interests.includes(interestInput.trim())) {
                          setInterests([...interests, interestInput.trim()]);
                          setInterestInput('');
                        }
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                  {interestInput && (
                    <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                      {INTEREST_OPTIONS.filter(i => i.toLowerCase().includes(interestInput.toLowerCase()) && !interests.includes(i)).map((option, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setInterests([...interests, option]);
                            setInterestInput('');
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Profile Prompt</label>
                {prompts.map((prompt, idx) => (
                  <div key={idx} className="space-y-2 mb-2">
                    <input
                      type="text"
                      placeholder="Prompt Question"
                      value={prompt.question}
                      onChange={e => {
                        const newPrompts = [...prompts];
                        newPrompts[idx].question = e.target.value;
                        setPrompts(newPrompts);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                    <textarea
                      rows={2}
                      placeholder="Your Answer..."
                      value={prompt.answer}
                      onChange={e => {
                        const newPrompts = [...prompts];
                        newPrompts[idx].answer = e.target.value;
                        setPrompts(newPrompts);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none"
                    />
                  </div>
                ))}
                {prompts.length < 3 && (
                  <button type="button" onClick={() => setPrompts([...prompts, { question: '', answer: '' }])} className="text-xs text-rose-500 font-bold hover:text-rose-400">
                    + Add another prompt
                  </button>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Favorite Spot</label>
                <input
                  type="text"
                  placeholder="Where do you like to hangout?"
                  value={favoriteSpot}
                  onChange={e => setFavoriteSpot(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Job</label>
                  <input type="text" value={job} onChange={e => setJob(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Education</label>
                  <input type="text" value={education} onChange={e => setEducation(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Drinking</label>
                  <select value={drinking} onChange={e => setDrinking(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500">
                    <option value="">Skip</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                    <option value="sometimes">Sometimes</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Smoking</label>
                  <select value={smoking} onChange={e => setSmoking(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500">
                    <option value="">Skip</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                    <option value="sometimes">Sometimes</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Gym</label>
                  <select value={gym} onChange={e => setGym(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500">
                    <option value="">Skip</option>
                    <option value="active">Active</option>
                    <option value="sometimes">Sometimes</option>
                    <option value="rarely">Rarely</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Height (cm)</label>
                  <input type="number" placeholder="e.g. 175" value={height} onChange={e => setHeight(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Weight (kg)</label>
                  <input type="number" placeholder="e.g. 70" value={weight} onChange={e => setWeight(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500" />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: Photo ── */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Camera className="w-5 h-5 text-rose-500" />
                <h2 className="text-xl font-bold text-white">Your Photo</h2>
              </div>
              <p className="text-slate-400 text-sm">A photo is required to start matching. Make it count!</p>

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`relative rounded-2xl border-2 border-dashed cursor-pointer overflow-hidden aspect-[3/4] flex items-center justify-center transition-all ${
                  photoPreview ? 'border-rose-500/50' : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                {photoPreview ? (
                  <>
                    <img src={photoPreview} className="w-full h-full object-cover" alt="Preview" />
                    <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <p className="text-white font-semibold text-sm">Change photo</p>
                    </div>
                    {photoUploaded && (
                      <div className="absolute top-3 right-3 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center space-y-3 text-slate-500">
                    <Camera className="w-12 h-12" />
                    <p className="text-sm font-medium">Tap to add photo</p>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />

              {photoFile && !photoUploaded && (
                <button
                  onClick={handleUploadPhoto}
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-lg shadow-rose-500/30 transition-all transform active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:hover:bg-rose-600"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{loading ? 'Uploading...' : 'Upload'}</span>
                </button>
              )}

              {photoUploaded && (
                <p className="text-emerald-400 text-sm text-center font-semibold flex items-center justify-center space-x-1.5">
                  <Check className="w-4 h-4 inline mr-1" />
                  <span>Photo uploaded! You're ready to go.</span>
                </p>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center space-x-3 mt-6">
            {step > 0 && (
              <button
                onClick={() => { setStep(p => p - 1); setError(''); }}
                className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center space-x-2"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}

            {step < 4 ? (
              <button
                onClick={handleNext}
                disabled={loading || !!ageError}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition-colors flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(244,63,94,0.3)] disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>{loading ? 'Saving...' : 'Continue'}</span>
                {!loading && <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={!photoUploaded || loading}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white text-sm font-bold transition-all flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(244,63,94,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4 fill-white" />}
                <span>{loading ? 'Setting up...' : 'Start Matching!'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Location Picker Modal */}
      <LocationPickerModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        currentLat={latitude}
        currentLng={longitude}
        currentLocationName={locationStatus}
        onLocationSelected={(loc) => {
          setLatitude(loc.latitude);
          setLongitude(loc.longitude);
          setLocationStatus(loc.locationName);
        }}
      />
    </div>
  );
}
