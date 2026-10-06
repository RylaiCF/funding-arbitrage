import React from 'react';

export default function PresetTabs({ presets, activePreset, onSelectPreset }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 pb-1 md:pb-0">
      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mr-1 hidden lg:inline-block">
        Пресеты:
      </span>
      <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800/80">
        {presets.map((p) => {
          const Icon = p.icon;
          const isActive = activePreset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelectPreset(isActive && p.id !== 'all' ? 'all' : p.id)}
              title={p.tooltip}
              className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all select-none whitespace-nowrap cursor-pointer ${
                isActive
                  ? p.id === 'hot'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : p.id === 'conservative'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : p.id === 'high_yield'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 ${
                  isActive
                    ? p.id === 'hot'
                      ? 'text-amber-400'
                      : p.id === 'conservative'
                      ? 'text-emerald-400'
                      : p.id === 'high_yield'
                      ? 'text-cyan-400'
                      : 'text-slate-200'
                    : 'text-slate-500 group-hover:text-slate-300'
                }`}
              />
              <span>{p.shortLabel}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none ${
                  isActive
                    ? p.id === 'hot'
                      ? 'bg-amber-500/30 text-amber-200 font-bold'
                      : p.id === 'conservative'
                      ? 'bg-emerald-500/30 text-emerald-200 font-bold'
                      : p.id === 'high_yield'
                      ? 'bg-cyan-500/30 text-cyan-200 font-bold'
                      : 'bg-slate-700 text-slate-100 font-bold'
                    : 'bg-slate-800/80 text-slate-400 group-hover:text-slate-300'
                }`}
              >
                {p.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
