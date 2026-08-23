import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { CircleUser, Trash2, Upload, RefreshCw, X, MapPin } from 'lucide-react';
import { reverseGeocode } from '../utils/location';
import { getPhotoUrl, handleImageError } from '../utils/photoUrl';
import LocationPickerModal from '../components/LocationPickerModal';

const INTEREST_OPTIONS = [
  'Movies', 'Coffee', 'Hiking', 'Photography', 'Foodie', 'Travel', 
  'Reading', 'Music', 'Gaming', 'Fitness', 'Art', 'Dancing', 
  'Cooking', 'Fashion', 'Pets', 'Sports', 'Technology', 'Yoga', 'Anime', 'Board Games'
];

interface Photo {
  id: string;
  url: string;
  isPrimary: boolean;
}

interface ProfileData {
  id: string;
  name: string;
  bio: string;
  gender: string;
  birthdate: string;
  latitude: number;
  longitude: number;
  gendersInterestedIn: string[];
  photos: Photo[];
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
  completionPercentage?: number;
}

export default function ProfilePage() {
  const { user, updateUserProfile } = useAuth();

  // Profile fields
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState('male');
  const [birthdate, setBirthdate] = useState('');
  const [gendersInterested, setGendersInterested] = useState<string[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  
  // New profile fields
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
  const [completionPercentage, setCompletionPercentage] = useState(0);

  // Status states
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [locationName, setLocationName] = useState<string>('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);

  useEffect(() => {
    if (user?.profile?.latitude && user?.profile?.longitude) {
      setLatitude(user.profile.latitude);
      setLongitude(user.profile.longitude);
      reverseGeocode(user.profile.latitude, user.profile.longitude).then(setLocationName);
    }
  }, [user?.profile?.latitude, user?.profile?.longitude]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await api.get<ProfileData>('/profiles/me');
        setName(data.name || '');
        setBio(data.bio || '');
        setGender(data.gender || 'male');
        setGendersInterested(data.gendersInterestedIn || []);
        setPhotos(data.photos || []);
        if (data.birthdate) {
          // Format for HTML5 date input (YYYY-MM-DD)
          setBirthdate(new Date(data.birthdate).toISOString().split('T')[0]);
        }
        
        if (data.interests?.length) setInterests(data.interests);
        if (data.prompts?.length) setPrompts(data.prompts);
        if (data.favoriteSpot) setFavoriteSpot(data.favoriteSpot);
        if (data.job) setJob(data.job);
        if (data.education) setEducation(data.education);
        if (data.drinking) setDrinking(data.drinking);
        if (data.smoking) setSmoking(data.smoking);
        if (data.gym) setGym(data.gym);
        if (data.height) setHeight(data.height.toString());
        if (data.weight) setWeight(data.weight.toString());
        if (data.completionPercentage) setCompletionPercentage(data.completionPercentage);
        if (data.latitude !== undefined && data.longitude !== undefined) {
          setLatitude(data.latitude);
          setLongitude(data.longitude);
          reverseGeocode(data.latitude, data.longitude).then(setLocationName);
        }

        updateUserProfile(data);
      } catch (err) {
        console.error('[ProfilePage] Failed to fetch profile details:', err);
      }
    };
    loadProfile();
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    setIsSavingProfile(true);

    try {
      const payload: any = {
        name,
        bio,
        gender,
        gendersInterestedIn: gendersInterested,
        interests: interests,
        prompts: prompts.filter(p => p.question.trim() && p.answer.trim()),
        favoriteSpot,
        job,
        education,
        drinking,
        smoking,
        gym,
        height: height ? Number(height) : undefined,
        weight: weight ? Number(weight) : undefined,
        latitude: latitude !== null ? latitude : undefined,
        longitude: longitude !== null ? longitude : undefined,
      };

      if (birthdate) {
        payload.birthdate = new Date(birthdate).toISOString();
      }

      const updated = await api.put<any>('/profiles/me', payload);
      setProfileSuccess('Profile details updated successfully!');
      if (updated.completionPercentage) setCompletionPercentage(updated.completionPercentage);
      updateUserProfile(updated);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Upload image
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const originalFile = e.target.files?.[0];
    if (!originalFile) return;

    setIsUploadingPhoto(true);
    setProfileError('');

    let file = originalFile;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    // Handle HEIC/HEIF format conversions for Apple devices
    if (ext === 'heic' || ext === 'heif') {
      try {
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
        setProfileError("Failed to process HEIC file. Please try another image.");
        setIsUploadingPhoto(false);
        return;
      }
    } else if (!file.type || !file.type.startsWith('image/')) {
      if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        setProfileError('Please select a valid image file (JPG, PNG, GIF, WEBP, HEIC).');
        setIsUploadingPhoto(false);
        return;
      }
      const type = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
      file = new File([originalFile], originalFile.name, { type });
    }

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const newPhoto = await api.post<Photo>('/profiles/me/photos', formData);
      setPhotos((prev) => [...prev, newPhoto]);
      setProfileSuccess('Photo uploaded successfully!');
    } catch (err: any) {
      setProfileError(err.message || 'Failed to upload photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Delete image
  const handlePhotoDelete = async (photoId: string) => {
    setProfileError('');
    if (photos.length <= 1) {
      setProfileError('You must keep at least one profile photo.');
      return;
    }
    try {
      await api.delete(`/profiles/me/photos/${photoId}`);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setProfileSuccess('Photo deleted successfully!');
    } catch (err: any) {
      setProfileError(err.message || 'Failed to delete photo.');
    }
  };

  // Set primary image
  const handlePhotoPrimary = async (photoId: string) => {
    setProfileError('');
    try {
      await api.put(`/profiles/me/photos/${photoId}/primary`, {});
      setPhotos((prev) =>
        prev.map((p) => ({
          ...p,
          isPrimary: p.id === photoId,
        }))
      );
      setProfileSuccess('Primary photo updated successfully!');
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update primary photo.');
    }
  };

  const handleGenderInterestChange = (g: string) => {
    if (gendersInterested.includes(g)) {
      setGendersInterested((prev) => prev.filter((item) => item !== g));
    } else {
      setGendersInterested((prev) => [...prev, g]);
    }
  };

  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const getAge = (birthdateString: string): number => {
    if (!birthdateString) return 18;
    const today = new Date();
    const birthDate = new Date(birthdateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const primaryPreviewPhoto = photos.find(p => p.isPrimary) || photos[0];
  const otherPreviewPhotos = photos.filter(p => p.id !== primaryPreviewPhoto?.id);

  return (
    <Layout>
      <div className="space-y-8 max-w-4xl mx-auto pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-100 flex items-center space-x-2">
              <CircleUser className="w-8 h-8 text-rose-500" />
              <span>My Profile</span>
            </h1>
            <div className="mt-2 flex items-center space-x-3">
              <div className="text-xs text-slate-400 font-bold">Profile Completion</div>
              <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-rose-500 to-amber-500" style={{ width: `${completionPercentage}%` }}></div>
              </div>
              <div className="text-xs text-rose-400 font-bold">{completionPercentage}%</div>
            </div>
          </div>
          <button
            onClick={() => {
              setShowPreviewModal(true);
            }}
            className="px-6 py-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm font-bold shadow-md transition-colors"
          >
            Preview Profile
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left: Photos list */}
          <div className="glass p-6 rounded-2xl border border-slate-800 flex flex-col md:col-span-1">
            <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center space-x-2">
              <span>Profile Photos</span>
              <span className="text-xs font-normal text-slate-500">({photos.length}/6)</span>
            </h3>

            {profileError && <p className="text-xs text-rose-400 mb-3">{profileError}</p>}
            {profileSuccess && <p className="text-xs text-emerald-400 mb-3">{profileSuccess}</p>}

            {/* Photos Grid layout */}
            <div className="grid grid-cols-2 gap-3 flex-1 mb-4">
              {photos.map((p) => (
                <div key={p.id} className="relative group aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
                  <img
                    src={getPhotoUrl(p.url)}
                    alt="Profile"
                    onError={handleImageError}
                    className="w-full h-full object-cover"
                  />
                  
                  {p.isPrimary && (
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-rose-600 text-[10px] font-bold text-white z-10">
                      Primary
                    </span>
                  )}

                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 z-10">
                    {!p.isPrimary && (
                      <button
                        type="button"
                        onClick={() => handlePhotoPrimary(p.id)}
                        className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-bold"
                        title="Set Primary"
                      >
                        Set Main
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (photos.length <= 1) {
                          setProfileError('You must keep at least one profile photo.');
                          return;
                        }
                        handlePhotoDelete(p.id);
                      }}
                      className={`p-1.5 rounded-lg text-white transition-all ${
                        photos.length <= 1
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                          : 'bg-rose-600 hover:bg-rose-500'
                      }`}
                      title={photos.length <= 1 ? 'You must keep at least 1 photo' : 'Delete Photo'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Upload Card */}
              {photos.length < 6 && (
                <label className="relative border border-dashed border-slate-700 hover:border-rose-500 bg-slate-900/40 hover:bg-slate-900/60 rounded-xl cursor-pointer flex flex-col items-center justify-center aspect-square transition-all duration-300">
                  {isUploadingPhoto ? (
                    <RefreshCw className="w-6 h-6 text-rose-500 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-slate-500 group-hover:text-rose-500 mb-2" />
                      <span className="text-xs text-slate-500">Upload Photo</span>
                    </>
                  )}
                  <input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={handlePhotoUpload} disabled={isUploadingPhoto} />
                </label>
              )}
            </div>

            <p className="text-[10px] text-slate-500 italic leading-snug">
              Note: Images are resized, compressed to WebP, and EXIF location data is automatically stripped.
            </p>
          </div>

          {/* Right: Main Form Profile details */}
          <div className="md:col-span-2 space-y-8">
            <div className="glass p-6 rounded-2xl border border-slate-800">
              <h3 className="text-lg font-bold text-slate-200 mb-6">Profile Details</h3>

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Birthdate (Age)</label>
                  <input
                    type="date"
                    required
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]} // Must be 18+
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">You must be at least 18 years old.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Biography / About Me</label>
                  <textarea
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                    placeholder="Tell other candidates about yourself..."
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">My Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">I am interested in</label>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      {['male', 'female', 'other'].map((g) => (
                        <label key={g} className="flex items-center space-x-2 text-sm text-slate-300 capitalize cursor-pointer">
                          <input
                            type="checkbox"
                            checked={gendersInterested.includes(g)}
                            onChange={() => handleGenderInterestChange(g)}
                            className="rounded border-slate-800 text-rose-500 focus:ring-rose-500/50 bg-slate-900"
                          />
                          <span>{g}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-800/50 pt-6 mt-6">
                  <h4 className="text-sm font-bold text-slate-200 mb-4">More Details</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Interests</label>
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
                          onChange={(e) => setInterestInput(e.target.value)} 
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (interestInput.trim() && !interests.includes(interestInput.trim())) {
                                setInterests([...interests, interestInput.trim()]);
                                setInterestInput('');
                              }
                            }
                          }}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500" 
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
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Profile Prompts</label>
                      {prompts.map((prompt, idx) => (
                        <div key={idx} className="space-y-2 mb-2">
                          <input type="text" placeholder="Prompt Question" value={prompt.question} onChange={e => {
                            const newPrompts = [...prompts];
                            newPrompts[idx].question = e.target.value;
                            setPrompts(newPrompts);
                          }} className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500" />
                          <textarea rows={2} placeholder="Your Answer..." value={prompt.answer} onChange={e => {
                            const newPrompts = [...prompts];
                            newPrompts[idx].answer = e.target.value;
                            setPrompts(newPrompts);
                          }} className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none" />
                        </div>
                      ))}
                      {prompts.length < 3 && (
                        <button type="button" onClick={() => setPrompts([...prompts, { question: '', answer: '' }])} className="text-xs text-rose-500 font-bold hover:text-rose-400">
                          + Add another prompt
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Favorite Spot</label>
                      <input type="text" value={favoriteSpot} onChange={(e) => setFavoriteSpot(e.target.value)} className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Job</label>
                        <input type="text" value={job} onChange={(e) => setJob(e.target.value)} className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Education</label>
                        <input type="text" value={education} onChange={(e) => setEducation(e.target.value)} className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Drinking</label>
                        <select value={drinking} onChange={(e) => setDrinking(e.target.value)} className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500">
                          <option value="">Skip</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                          <option value="sometimes">Sometimes</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Smoking</label>
                        <select value={smoking} onChange={(e) => setSmoking(e.target.value)} className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500">
                          <option value="">Skip</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                          <option value="sometimes">Sometimes</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Gym</label>
                        <select value={gym} onChange={(e) => setGym(e.target.value)} className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500">
                          <option value="">Skip</option>
                          <option value="active">Active</option>
                          <option value="sometimes">Sometimes</option>
                          <option value="rarely">Rarely</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Height & Weight</label>
                        <div className="flex space-x-2">
                          <input type="number" placeholder="cm" value={height} onChange={(e) => setHeight(e.target.value)} className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500" />
                          <input type="number" placeholder="kg" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location Section */}
                <div className="border-t border-slate-800/50 pt-6 mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Location & Discovery Area
                    </label>
                    <span className="text-[10px] text-rose-400 font-semibold flex items-center">
                      <MapPin className="w-3 h-3 mr-0.5" />
                      <span>Tap to change</span>
                    </span>
                  </div>

                  <div
                    onClick={() => setShowLocationModal(true)}
                    className="w-full bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-rose-500/60 rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer group shadow-md hover:shadow-rose-500/10"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 group-hover:bg-rose-500/25 group-hover:scale-105 flex items-center justify-center text-rose-500 flex-shrink-0 transition-all">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-sm font-bold text-slate-100 group-hover:text-rose-200 transition-colors truncate">
                          {locationName || (latitude && longitude ? `${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°` : 'Set your location')}
                        </p>
                        <p className="text-[11px] text-slate-400 font-normal mt-0.5">
                          {latitude && longitude ? 'Tap to search city or detect GPS location' : 'Tap to select your city or detect GPS'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowLocationModal(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-bold transition-colors flex-shrink-0 ml-2 shadow-sm"
                    >
                      Change ✎
                    </button>
                  </div>
                </div>

                <div className="pt-6 flex items-center justify-between border-t border-slate-800/50 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowLocationModal(true)}
                    className="text-xs text-slate-400 hover:text-rose-400 flex items-center transition-colors group cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 mr-1 text-rose-500 group-hover:scale-110 transition-transform" />
                    <span className="truncate max-w-[150px] sm:max-w-[220px]">
                      {locationName || (latitude ? `${latitude.toFixed(2)}°, ${longitude?.toFixed(2)}°` : 'Set Location')}
                    </span>
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-6 py-2.5 rounded-xl bg-gradient text-white text-xs font-bold shadow-md hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isSavingProfile ? 'Saving Details...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Location Picker Modal */}
      <LocationPickerModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        currentLat={latitude}
        currentLng={longitude}
        currentLocationName={locationName}
        onLocationSelected={(loc) => {
          setLatitude(loc.latitude);
          setLongitude(loc.longitude);
          setLocationName(loc.locationName);
        }}
      />

      {/* Preview Modal Overlay */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setShowPreviewModal(false)}
              className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
            >
              <Trash2 className="w-6 h-6 hidden" /> {/* Just to keep the import clean, we'll use an X. wait no, let's use a standard close button */}
              <span className="font-bold text-xl">✕</span>
            </button>
          </div>
          
          <div className="text-center mb-6 absolute top-10 w-full pointer-events-none">
            <h2 className="text-xl font-bold text-slate-200">This is how others see you</h2>
            <p className="text-sm text-slate-400">Preview mode</p>
          </div>

          <div className="relative w-full max-w-sm h-[75vh] md:h-[80vh] rounded-3xl overflow-hidden shadow-2xl glass border border-slate-800/80 mt-16 flex flex-col bg-slate-950">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide pb-10">
              
              {/* Primary Image Section */}
              <div className="relative w-full aspect-[3/4] md:aspect-[3.2/4]">
                {primaryPreviewPhoto ? (
                  <img
                    src={getPhotoUrl(primaryPreviewPhoto?.url)}
                    alt={name}
                    onError={handleImageError}
                    className="w-full h-full object-cover select-none pointer-events-none"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-900">
                    <CircleUser className="w-20 h-20" />
                    <span className="text-xs mt-2">No photo uploaded</span>
                  </div>
                )}
                {/* Visual Vignette overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
                
                {/* Profile Basic Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-20 flex flex-col pointer-events-none">
                  <div className="flex items-baseline space-x-2">
                    <h3 className="text-3xl font-black text-slate-100 drop-shadow-md">{name || 'Your Name'}</h3>
                    <span className="text-2xl font-bold text-slate-300 drop-shadow-md">{birthdate ? getAge(birthdate) : 18}</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 backdrop-blur-sm">
                      {gender}
                    </span>
                    <span className="text-xs text-slate-300 font-medium drop-shadow-sm">
                      0.0 km away
                    </span>
                  </div>
                </div>
              </div>

              {/* Bio Section */}
              {bio && (
                <div className="p-6">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">About Me</h4>
                  <p className="text-base text-slate-200 leading-relaxed">
                    {bio}
                  </p>
                </div>
              )}

              {/* Interests & Details */}
              <div className="px-6 pb-6 space-y-4">
                {interests.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Interests</h4>
                    <div className="flex flex-wrap gap-2">
                      {interests.map((interest, idx) => (
                        <span key={idx} className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Info Pills */}
                <div className="flex flex-wrap gap-2">
                  {job && <span className="px-3 py-1 rounded-full border border-slate-700 text-slate-400 text-xs font-medium flex items-center space-x-1">💼 <span>{job}</span></span>}
                  {education && <span className="px-3 py-1 rounded-full border border-slate-700 text-slate-400 text-xs font-medium flex items-center space-x-1">🎓 <span>{education}</span></span>}
                  {height && <span className="px-3 py-1 rounded-full border border-slate-700 text-slate-400 text-xs font-medium flex items-center space-x-1">📏 <span>{height} cm</span></span>}
                  {weight && <span className="px-3 py-1 rounded-full border border-slate-700 text-slate-400 text-xs font-medium flex items-center space-x-1">⚖️ <span>{weight} kg</span></span>}
                  {gym && <span className="px-3 py-1 rounded-full border border-slate-700 text-slate-400 text-xs font-medium flex items-center space-x-1">💪 <span>Gym: {gym}</span></span>}
                  {drinking && <span className="px-3 py-1 rounded-full border border-slate-700 text-slate-400 text-xs font-medium flex items-center space-x-1">🍷 <span>Drinks: {drinking}</span></span>}
                  {smoking && <span className="px-3 py-1 rounded-full border border-slate-700 text-slate-400 text-xs font-medium flex items-center space-x-1">🚬 <span>Smokes: {smoking}</span></span>}
                  {favoriteSpot && <span className="px-3 py-1 rounded-full border border-slate-700 text-slate-400 text-xs font-medium flex items-center space-x-1">📍 <span>Fav spot: {favoriteSpot}</span></span>}
                </div>
              </div>

              {/* Interleaved Prompts and Other Photos */}
              <div className="flex flex-col space-y-4 px-4 pb-6 mt-4">
                {Array.from({ length: Math.max(otherPreviewPhotos.length, prompts.length) }).map((_, i) => (
                  <React.Fragment key={i}>
                    {prompts[i] && prompts[i].question && prompts[i].answer && (
                      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50">
                        <p className="text-xs text-rose-400 font-bold mb-2 uppercase tracking-wider">{prompts[i].question}</p>
                        <p className="text-lg text-slate-200 font-serif italic">"{prompts[i].answer}"</p>
                      </div>
                    )}
                    {otherPreviewPhotos[i] && (
                      <div className="w-full rounded-2xl overflow-hidden shadow-lg aspect-[3/4]">
                        <img
                          src={getPhotoUrl(otherPreviewPhotos[i].url)}
                          alt={`${name} detail`}
                          onError={handleImageError}
                          className="w-full h-full object-cover select-none pointer-events-none"
                        />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
