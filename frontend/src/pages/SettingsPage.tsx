import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { Settings, Lock, ShieldAlert, PlayCircle, MapPin } from 'lucide-react';
import { reverseGeocode } from '../utils/location';
import LocationPickerModal from '../components/LocationPickerModal';

interface ProfileData {
  id: string;
  ageInterestedInMin: number;
  ageInterestedInMax: number;
  distanceInterestedIn: number;
}

export default function SettingsPage() {
  const { user, logout, updateUserProfile } = useAuth();
  const navigate = useNavigate();

  // Tutorial re-watch limit (Max 3 times)
  const MAX_REWATCH_LIMIT = 3;
  const [rewatchCount, setRewatchCount] = useState(0);

  useEffect(() => {
    const userKey = user?.id ? `heartsync_tutorial_rewatches_${user.id}` : 'heartsync_tutorial_rewatches';
    const count = parseInt(localStorage.getItem(userKey) || '0', 10);
    setRewatchCount(count);
  }, [user]);

  const handleRewatchClick = () => {
    const userKey = user?.id ? `heartsync_tutorial_rewatches_${user.id}` : 'heartsync_tutorial_rewatches';
    const count = parseInt(localStorage.getItem(userKey) || '0', 10);
    if (count >= MAX_REWATCH_LIMIT) return;

    const newCount = count + 1;
    localStorage.setItem(userKey, newCount.toString());
    setRewatchCount(newCount);
    navigate('/tutorial');
  };

  // Settings fields
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(35);
  const [distance, setDistance] = useState(50);
  const [locationName, setLocationName] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status states
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Deletion double confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user?.profile?.latitude && user?.profile?.longitude) {
      reverseGeocode(user.profile.latitude, user.profile.longitude).then(setLocationName);
    }
  }, [user?.profile?.latitude, user?.profile?.longitude]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await api.get<ProfileData>('/profiles/me');
        setAgeMin(data.ageInterestedInMin || 18);
        setAgeMax(data.ageInterestedInMax || 100);
        setDistance(data.distanceInterestedIn || 50);
      } catch (err) {
        console.error('[SettingsPage] Failed to fetch settings details:', err);
      }
    };
    loadSettings();
  }, []);

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccess('');
    setSettingsError('');
    setIsSavingSettings(true);

    try {
      const updated = await api.put<any>('/profiles/me', {
        ageInterestedInMin: ageMin,
        ageInterestedInMax: ageMax,
        distanceInterestedIn: distance,
      });
      setSettingsSuccess('Match preferences updated successfully!');
      updateUserProfile(updated);
    } catch (err: any) {
      setSettingsError(err.message || 'Failed to update preferences.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setIsSavingPassword(true);

    try {
      await api.put('/profiles/me/change-password', {
        currentPassword,
        newPassword,
      });
      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Delete account cascade handler
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;

    setIsDeleting(true);
    try {
      await api.delete('/profiles/me/delete-account');
      logout();
      navigate('/login');
    } catch (err: any) {
      alert(err.message || 'Account deletion failed.');
      setIsDeleting(false);
    }
  };

  return (
    <Layout>
      <div className="w-full max-w-2xl mx-auto space-y-6 pb-20">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 flex items-center space-x-2">
          <Settings className="w-7 h-7 sm:w-8 sm:h-8 text-rose-500" />
          <span>App Settings</span>
        </h1>

        <div className="space-y-6">
          {/* Match Preferences card */}
          <div className="glass p-4 sm:p-6 rounded-2xl border border-slate-800 w-full overflow-hidden">
            <h3 className="text-base sm:text-lg font-bold text-slate-200 mb-5">Discovery Preferences</h3>

            {settingsError && <p className="text-xs text-rose-400 mb-4">{settingsError}</p>}
            {settingsSuccess && <p className="text-xs text-emerald-400 mb-4">{settingsSuccess}</p>}

            <form onSubmit={handleSettingsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Maximum Distance ({distance} km)
                </label>
                <input
                  type="range"
                  min={5}
                  max={150}
                  step={5}
                  value={distance}
                  onChange={(e) => setDistance(Number(e.target.value))}
                  className="w-full h-2 mt-4 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Age Range ({ageMin} - {ageMax})
                </label>
                <div className="flex items-center space-x-2 mt-1">
                  <input
                    type="number"
                    min={18}
                    max={100}
                    value={ageMin}
                    onChange={(e) => setAgeMin(Number(e.target.value))}
                    className="w-20 bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-2.5 py-1.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                  <span className="text-slate-500 text-xs">to</span>
                  <input
                    type="number"
                    min={18}
                    max={100}
                    value={ageMax}
                    onChange={(e) => setAgeMax(Number(e.target.value))}
                    className="w-20 bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-2.5 py-1.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Your Location */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Your Current Location
                </label>
                <div
                  onClick={() => setShowLocationModal(true)}
                  className="w-full bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-rose-500/60 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between transition-all cursor-pointer group shadow-sm hover:shadow-rose-500/10 min-w-0"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1 mr-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 group-hover:bg-rose-500/25 flex items-center justify-center text-rose-500 flex-shrink-0 transition-colors">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-100 group-hover:text-rose-200 transition-colors truncate">
                        {locationName || 'Set your location'}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">Tap to change city or detect GPS</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-bold transition-colors flex-shrink-0">
                    Change ✎
                  </span>
                </div>
              </div>

              <div className="pt-4 text-right border-t border-slate-800/50 mt-6">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient text-white text-xs font-bold shadow-md hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSavingSettings ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="glass p-4 sm:p-6 rounded-2xl border border-slate-800 w-full overflow-hidden">
            <h3 className="text-base sm:text-lg font-bold text-slate-200 mb-5 flex items-center space-x-2">
              <Lock className="w-5 h-5 text-rose-500" />
              <span>Security Settings</span>
            </h3>

            {passwordError && <p className="text-xs text-rose-400 mb-4">{passwordError}</p>}
            {passwordSuccess && <p className="text-xs text-emerald-400 mb-4">{passwordSuccess}</p>}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-3 sm:px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-3 sm:px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-3 sm:px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="pt-2 text-right">
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="w-full sm:w-auto px-6 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  {isSavingPassword ? 'Updating...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>

          {/* Subtle Low-Priority App Tutorial Row */}
          <div className="p-4 rounded-2xl border border-slate-800/80 bg-slate-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs w-full overflow-hidden">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="p-2 rounded-xl bg-slate-800/80 text-slate-400 flex-shrink-0">
                <PlayCircle className="w-4 h-4 text-slate-300" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-200 text-xs">App Tutorial</span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    ({MAX_REWATCH_LIMIT - rewatchCount} / {MAX_REWATCH_LIMIT} left)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate sm:whitespace-normal">
                  {rewatchCount >= MAX_REWATCH_LIMIT
                    ? 'Maximum 3 re-watches reached.'
                    : 'Re-watch the onboarding guide and practice bot swiping.'}
                </p>
              </div>
            </div>

            <button
              onClick={handleRewatchClick}
              disabled={rewatchCount >= MAX_REWATCH_LIMIT}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all self-start sm:self-auto flex-shrink-0 ${
                rewatchCount >= MAX_REWATCH_LIMIT
                  ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed border border-slate-800/60'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 shadow-sm'
              }`}
            >
              {rewatchCount >= MAX_REWATCH_LIMIT ? 'Limit Reached' : 'Re-watch'}
            </button>
          </div>

          {/* Delete Account Card */}
          <div className="p-4 sm:p-6 rounded-2xl border border-rose-950/40 bg-rose-950/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full overflow-hidden">
            <div>
              <h4 className="text-sm font-bold text-rose-400">Danger Zone</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md leading-relaxed">
                Deleting your profile will permanently remove your photos, matches, swipe records, and message threads. This operation cannot be undone.
              </p>
            </div>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-rose-500/30 text-rose-500 font-bold hover:bg-rose-500/10 transition-colors text-xs flex-shrink-0"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Account Deletion Double Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass max-w-sm w-full rounded-2xl p-6 border border-slate-800 text-center relative">
            <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-100">Permanently Delete Account?</h3>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
              This will erase all profile details, message logs, and swipe history from the server.
              Type <strong className="text-rose-400">DELETE</strong> below to authorize:
            </p>

            <input
              type="text"
              placeholder="Type DELETE"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full mt-4 bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
            />

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                className="flex-1 py-2 text-sm font-semibold rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800 transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                className="flex-1 py-2 text-sm font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 transition-all"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Location Picker Modal */}
      <LocationPickerModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        currentLat={user?.profile?.latitude}
        currentLng={user?.profile?.longitude}
        currentLocationName={locationName}
        onLocationSelected={(loc) => {
          setLocationName(loc.locationName);
        }}
      />
    </Layout>
  );
}
