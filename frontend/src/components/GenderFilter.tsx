
interface GenderFilterProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export default function GenderFilter({ value, onChange }: GenderFilterProps) {
  const toggleGender = (g: string) => {
    onChange(
      value.includes(g) ? value.filter(x => x !== g) : [...value, g]
    );
  };

  return (
    <div className="w-full mb-6 z-40 relative">
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">Filter by Interest</label>
      <div className="grid grid-cols-3 gap-2">
        {['male', 'female', 'other'].map(g => (
          <button
            key={g}
            onClick={() => toggleGender(g)}
            className={`py-2.5 rounded-xl text-sm font-semibold capitalize border transition-all ${
              value.includes(g)
                ? 'bg-rose-600 border-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
          >
            {g === 'male' ? 'Men' : g === 'female' ? 'Women' : 'Other'}
          </button>
        ))}
      </div>
    </div>
  );
}
