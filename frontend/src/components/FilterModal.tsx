import { useState, useEffect } from 'react';
import { X, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface FilterState {
  genders: string[];
  ageMin: number;
  ageMax: number;
  distance: number;
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFilters: FilterState;
  onSave: (filters: FilterState) => void;
}

export default function FilterModal({ isOpen, onClose, initialFilters, onSave }: FilterModalProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(initialFilters);

  // Reset local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalFilters(initialFilters);
    }
  }, [isOpen, initialFilters]);

  const toggleGender = (g: string) => {
    setLocalFilters(prev => ({
      ...prev,
      genders: prev.genders.includes(g)
        ? prev.genders.filter(x => x !== g)
        : [...prev.genders, g]
    }));
  };

  const handleSave = () => {
    onSave(localFilters);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-md bg-slate-950 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 rounded-t-3xl">
            <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
              <SlidersHorizontal className="w-5 h-5 text-rose-500" />
              <span>Filters</span>
            </h2>
            <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-6">
            
            {/* Gender Preference */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">Interested in</label>
              <div className="grid grid-cols-3 gap-2">
                {['male', 'female', 'other'].map(g => (
                  <button
                    key={g}
                    onClick={() => toggleGender(g)}
                    className={`py-2.5 rounded-xl text-sm font-semibold capitalize border transition-all ${
                      localFilters.genders.includes(g)
                        ? 'bg-rose-600 border-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {g === 'male' ? '👨 Men' : g === 'female' ? '👩 Women' : '🌈 Other'}
                  </button>
                ))}
              </div>
            </div>

            {/* Age Range */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
                Age range: <span className="text-rose-400 font-bold">{localFilters.ageMin} – {localFilters.ageMax}</span>
              </label>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Min age: {localFilters.ageMin}</span>
                  </div>
                  <input
                    type="range"
                    min={18}
                    max={localFilters.ageMax - 1}
                    value={localFilters.ageMin}
                    onChange={e => setLocalFilters(prev => ({ ...prev, ageMin: Number(e.target.value) }))}
                    className="w-full accent-rose-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Max age: {localFilters.ageMax}</span>
                  </div>
                  <input
                    type="range"
                    min={localFilters.ageMin + 1}
                    max={80}
                    value={localFilters.ageMax}
                    onChange={e => setLocalFilters(prev => ({ ...prev, ageMax: Number(e.target.value) }))}
                    className="w-full accent-rose-500"
                  />
                </div>
              </div>
            </div>

            {/* Distance */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
                Maximum Distance: <span className="text-rose-400 font-bold">{localFilters.distance} km</span>
              </label>
              <input
                type="range"
                min={1}
                max={150}
                value={localFilters.distance}
                onChange={e => setLocalFilters(prev => ({ ...prev, distance: Number(e.target.value) }))}
                className="w-full accent-rose-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>1 km</span>
                <span>150 km</span>
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="p-4 pb-24 sm:pb-4 border-t border-slate-800 bg-slate-900/50 flex space-x-3 rounded-b-3xl sm:rounded-b-3xl">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-500/30 transition-all"
            >
              Apply Filters
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
