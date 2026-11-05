import React, { useRef } from 'react';
import { Loader2, Search, Flame, X } from 'lucide-react';
import CustomSelect from './CustomSelect';

const squeezeThresholdOptions = [
  { value: -5, label: 'Все минусы (< 0%)', desc: 'Любой отрицательный фандинг от -0.05%' },
  { value: -10, label: '≤ -0.10% / период', desc: 'Заметный шорт-сквиз (от ~-110% APY)' },
  { value: -50, label: '≤ -0.50% / период', desc: 'Высокий сквиз (доходность от 1.5%/день)' },
  { value: -100, label: '≤ -1.00% / период', desc: 'Сверхсквиз (доходность от 3-5%/день)' },
];

const oiRankOptions = [
  { value: 50, label: 'OI Топ 50', desc: 'Максимальная ликвидность' },
  { value: 100, label: 'OI Топ 100', desc: 'Ликвидные активы' },
  { value: 200, label: 'OI Топ 200', desc: 'Оптимальный баланс' },
  { value: 500, label: 'OI Топ 500', desc: 'Широкий спектр альткоинов' },
  { value: 2000, label: 'Все ранги OI', desc: 'Без ограничений по OI' },
];

export default function SqueezeControlsBar({
  isScanning,
  onStartScan,
  minNegativeBps = -5,
  onChangeMinNegativeBps,
  maxOiRank = 2000,
  onChangeMaxOiRank,
  searchQuery = '',
  onSearchChange,
}) {
  const searchInputRef = useRef(null);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Top row: Scan CTA & Filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Main CTA: Scan Button & Search */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          <button
            onClick={onStartScan}
            disabled={isScanning}
            className={`flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg ${
              isScanning
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-rose-500 via-amber-500 to-orange-500 hover:from-rose-400 hover:via-amber-400 hover:to-orange-400 text-slate-950 shadow-rose-500/25 active:scale-[0.98]'
            }`}
          >
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                <span>Сканирование сквизов...</span>
              </>
            ) : (
              <>
                <Flame className="w-4 h-4 text-slate-950 fill-current" />
                <span>Сканировать радар сквизов</span>
              </>
            )}
          </button>

          {/* Quick search input */}
          <div className="relative flex-1 min-w-[200px] sm:min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Поиск по монете или бирже..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  onSearchChange('');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-0.5 rounded-md hover:bg-slate-800/80"
                title="Очистить поиск"
                aria-label="Очистить поиск"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Threshold Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap hidden sm:inline">
              Порог сквиза:
            </span>
            <CustomSelect
              options={squeezeThresholdOptions}
              value={minNegativeBps}
              onChange={(val) => onChangeMinNegativeBps(Number(val))}
              minWidth="w-[190px]"
            />
          </div>

          {/* OI Rank Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap hidden sm:inline">
              Открытый интерес:
            </span>
            <CustomSelect
              options={oiRankOptions}
              value={maxOiRank}
              onChange={(val) => onChangeMaxOiRank(Number(val))}
              minWidth="w-[150px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
