import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { CircleUser, Trash2, Upload, RefreshCw } from 'lucide-react';

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

  // Status states
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
      };

      if (birthdate) {
        payload.birthdate = new Date(birthdate).toISOString();
      }

      const updated = await api.put<any>('/profiles/me', payload);
      setProfileSuccess('Profile details updated successfully!');
      updateUserProfile(updated);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Upload image
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setProfileError('');

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

  const getPhotoUrl = (url: string) => {
    return url.startsWith('/uploads') ? `${API_URL.replace('/api', '')}${url}` : url;
  };

  return (
    <Layout>
      <div className="space-y-8 max-w-4xl mx-auto pb-12">
        <h1 className="text-3xl font-extrabold text-slate-100 flex items-center space-x-2">
          <CircleUser className="w-8 h-8 text-rose-500" />
          <span>My Profile</span>
        </h1>

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
                  <img src={getPhotoUrl(p.url)} alt="Profile" className="w-full h-full object-cover" />
                  
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
                      onClick={() => handlePhotoDelete(p.id)}
                      className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-500"
                      title="Delete Photo"
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
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isUploadingPhoto} />
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

                <div className="pt-4 flex items-center justify-between border-t border-slate-800/50">
                  <span className="text-xs text-slate-500">
                    Location GPS: {user?.profile?.latitude?.toFixed(4)}, {user?.profile?.longitude?.toFixed(4)}
                  </span>
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
    </Layout>
  );
}
