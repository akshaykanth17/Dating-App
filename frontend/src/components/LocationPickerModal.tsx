import { useState, useEffect } from 'react';
import { MapPin, Search, Navigation, X, Check, Loader2, Globe } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { reverseGeocode } from '../utils/location';
import { motion, AnimatePresence } from 'framer-motion';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  locationName: string;
}

export const POPULAR_CITIES: { name: string; state: string; country: string; lat: number; lng: number }[] = [
  { name: 'Palakkad', state: 'Kerala', country: 'India', lat: 10.7867, lng: 76.6548 },
  { name: 'New Delhi', state: 'Delhi', country: 'India', lat: 28.6139, lng: 77.2090 },
  { name: 'Mumbai', state: 'Maharashtra', country: 'India', lat: 19.0760, lng: 72.8777 },
  { name: 'Bengaluru', state: 'Karnataka', country: 'India', lat: 12.9716, lng: 77.5946 },
  { name: 'Kochi', state: 'Kerala', country: 'India', lat: 9.9312, lng: 76.2673 },
  { name: 'Chennai', state: 'Tamil Nadu', country: 'India', lat: 13.0827, lng: 80.2707 },
  { name: 'Hyderabad', state: 'Telangana', country: 'India', lat: 17.3850, lng: 78.4867 },
  { name: 'Pune', state: 'Maharashtra', country: 'India', lat: 18.5204, lng: 73.8567 },
  { name: 'Kolkata', state: 'West Bengal', country: 'India', lat: 22.5726, lng: 88.3639 },
  { name: 'Goa', state: 'Goa', country: 'India', lat: 15.2993, lng: 74.1240 },
  { name: 'London', state: 'England', country: 'UK', lat: 51.5074, lng: -0.1278 },
  { name: 'New York', state: 'NY', country: 'USA', lat: 40.7128, lng: -74.0060 },
  { name: 'Dubai', state: 'Dubai', country: 'UAE', lat: 25.2048, lng: 55.2708 },
  { name: 'Singapore', state: 'Central', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
];

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLat?: number | null;
  currentLng?: number | null;
  currentLocationName?: string;
  onLocationSelected?: (location: LocationCoordinates) => void;
}

export default function LocationPickerModal({
  isOpen,
  onClose,
  currentLat,
  currentLng,
  currentLocationName,
  onLocationSelected,
}: LocationPickerModalProps) {
  const { user, updateUserProfile } = useAuth();
  const [query, setQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchResults, setSearchResults] = useState<{ name: string; lat: number; lng: number }[]>([]);
  const [selectedLoc, setSelectedLoc] = useState<LocationCoordinates | null>(null);

  // Sync and resolve location name on open or coordinate change
  useEffect(() => {
    if (!isOpen) return;

    if (currentLat && currentLng) {
      const isRawCoord = !currentLocationName || /^\d+(\.\d+)?°/.test(currentLocationName);

      if (!isRawCoord && currentLocationName) {
        setSelectedLoc({
          latitude: currentLat,
          longitude: currentLng,
          locationName: currentLocationName,
        });
      } else {
        // Resolve readable city name
        reverseGeocode(currentLat, currentLng).then((name) => {
          setSelectedLoc({
            latitude: currentLat,
            longitude: currentLng,
            locationName: name,
          });
        });
      }
    }
  }, [isOpen, currentLat, currentLng, currentLocationName]);

  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const name = await reverseGeocode(lat, lng);
          setSelectedLoc({
            latitude: lat,
            longitude: lng,
            locationName: name,
          });
        } catch {
          setSelectedLoc({
            latitude: lat,
            longitude: lng,
            locationName: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
          });
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.error('GPS error:', err);
        setIsLocating(false);
        alert('Could not fetch GPS location. Please check browser location permissions or choose a city from the list.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSearchChange = async (text: string) => {
    setQuery(text);
    if (!text || text.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const filteredPopular = POPULAR_CITIES.filter(
      (c) =>
        c.name.toLowerCase().includes(text.toLowerCase()) ||
        c.state.toLowerCase().includes(text.toLowerCase()) ||
        c.country.toLowerCase().includes(text.toLowerCase())
    ).map((c) => ({
      name: `${c.name}, ${c.state}, ${c.country}`,
      lat: c.lat,
      lng: c.lng,
    }));

    setSearchResults(filteredPopular);

    // Online geocoding search for global cities
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=5&addressdetails=1`
      );
      if (res.ok) {
        const data = await res.json();
        const onlineMatches = data.map((item: any) => ({
          name: item.display_name.split(',').slice(0, 3).join(', '),
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        }));

        // Combine deduplicated results
        const combined = [...filteredPopular];
        for (const item of onlineMatches) {
          if (!combined.some((c) => Math.abs(c.lat - item.lat) < 0.05 && Math.abs(c.lng - item.lng) < 0.05)) {
            combined.push(item);
          }
        }
        setSearchResults(combined.slice(0, 6));
      }
    } catch {
      // Keep popular matches if online fails
    }
  };

  const handleSelectCity = (item: { name: string; lat: number; lng: number }) => {
    setSelectedLoc({
      latitude: item.lat,
      longitude: item.lng,
      locationName: item.name,
    });
    setQuery('');
    setSearchResults([]);
  };

  const handleSaveLocation = async () => {
    if (!selectedLoc) return;

    setIsSaving(true);
    try {
      if (onLocationSelected) {
        onLocationSelected(selectedLoc);
      }

      // If user is authenticated, persist to backend
      if (user) {
        await api.put('/profiles/me', {
          latitude: selectedLoc.latitude,
          longitude: selectedLoc.longitude,
        });

        updateUserProfile({
          ...(user.profile || {}),
          latitude: selectedLoc.latitude,
          longitude: selectedLoc.longitude,
        });
      }

      onClose();
    } catch (err: any) {
      console.error('[LocationPickerModal] Save failed:', err);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="glass w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-slate-800 bg-slate-950/95 overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-500">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 leading-snug">Select Location</h3>
                  <p className="text-[11px] text-slate-400">Match with people and events nearby</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* GPS Auto-detect Button */}
              <button
                type="button"
                onClick={handleUseGPS}
                disabled={isLocating}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-950/50 to-slate-900 border border-rose-500/40 hover:border-rose-500 text-slate-100 flex items-center justify-between text-xs font-bold transition-all shadow-md active:scale-98 group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-600/30 group-hover:scale-105 transition-transform">
                    {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                  </div>
                  <div className="text-left">
                    <p className="text-slate-100 font-bold">Use Current GPS Location</p>
                    <p className="text-[10px] text-slate-400 font-normal">Detect automatically via device</p>
                  </div>
                </div>
                <span className="text-[11px] text-rose-400 font-semibold group-hover:underline">
                  {isLocating ? 'Detecting...' : 'Locate →'}
                </span>
              </button>

              {/* City Search Box */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Search City or Region
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="e.g. Palakkad, New Delhi, Mumbai..."
                    className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl pl-9.5 pr-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 placeholder:text-slate-500"
                  />
                  {query && (
                    <button
                      onClick={() => {
                        setQuery('');
                        setSearchResults([]);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="mt-2 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden divide-y divide-slate-800/60">
                    {searchResults.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectCity(item)}
                        className="w-full p-3 text-left hover:bg-slate-800/80 flex items-center justify-between text-xs transition-colors"
                      >
                        <span className="text-slate-200 font-medium truncate">{item.name}</span>
                        <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Popular Cities Quick Picks */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Popular Locations</span>
                  <Globe className="w-3 h-3 text-slate-500" />
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_CITIES.map((c, i) => {
                    const isSelected =
                      selectedLoc &&
                      Math.abs(selectedLoc.latitude - c.lat) < 0.05 &&
                      Math.abs(selectedLoc.longitude - c.lng) < 0.05;

                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() =>
                          handleSelectCity({
                            name: `${c.name}, ${c.state}, ${c.country}`,
                            lat: c.lat,
                            lng: c.lng,
                          })
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center space-x-1.5 ${
                          isSelected
                            ? 'bg-rose-600 border-rose-500 text-white shadow-md shadow-rose-600/30'
                            : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        <MapPin className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-rose-400'}`} />
                        <span>{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Selection Preview */}
              {selectedLoc && (
                <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-between shadow-inner">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                      <Check className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-400">Selected Location</p>
                      <p className="text-sm font-bold text-slate-100 truncate mt-0.5">{selectedLoc.locationName}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedLoc.latitude.toFixed(4)}°, {selectedLoc.longitude.toFixed(4)}°</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/70 flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLocation}
                disabled={!selectedLoc || isSaving}
                className="flex-1 py-2.5 rounded-xl bg-gradient text-white text-xs font-bold shadow-lg shadow-rose-500/30 hover:opacity-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-1.5"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{isSaving ? 'Updating...' : 'Set Location'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
