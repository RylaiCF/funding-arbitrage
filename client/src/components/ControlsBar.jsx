import React from 'react';
import { Play, Loader2, Filter, Search, SlidersHorizontal, ShieldCheck, BarChart3, TrendingUp, Zap } from 'lucide-react';
import CustomSelect from './CustomSelect';

const oiRankOptions = [
  { value: 25, label: 'Топ 25', desc: 'Высочайший открытый интерес' },
  { value: 50, label: 'Топ 50', desc: 'Высокая ликвидность' },
  { value: 100, label: 'Топ 100', desc: 'Сбалансированный выбор' },
  { value: 200, label: 'Топ 200', desc: 'Расширенный охват рынка' },
  { value: 500, label: 'Топ 500', desc: 'Широкий спектр альткоинов' },
  { value: 2000, label: 'Все ранги', desc: 'Без ограничений по OI' },
];

const candidateOptions = [
  { value: 25, label: '25 монет', desc: 'Быстрый отбор' },
  { value: 50, label: '50 монет', desc: 'Стандартный поиск (по умолчанию)' },
  { value: 75, label: '75 монет', desc: 'Углубленный поиск' },
  { value: 100, label: '100 монет', desc: 'Максимальный охват' },
  { value: 150, label: '150 монет', desc: 'Полный скрининг' },
];

export default function ControlsBar({
  isScanning,
  onStartScan,
  maxOiRank,
  onChangeMaxOiRank,
  timeframe,
  onChangeTimeframe,
  candidateCount,
  onChangeCandidateCount,
  activeMetric,
  onChangeActiveMetric,
  searchQuery,
  onSearchChange,
}) {
  const metrics = [
    { id: 'trimmed', label: 'Очищенный APY (Trimmed)', icon: ShieldCheck, desc: 'Без 5% верхних спайков + WinRate' },
    { id: 'median', label: 'Медианный APY', icon: BarChart3, desc: '100% защита от любых выбросов' },
    { id: 'sharpe', label: 'Коэффициент Шарпа', icon: TrendingUp, desc: 'Штрафует спайки и волатильность' },
    { id: 'current', label: 'Текущий APY', icon: Zap, desc: 'Мгновенный спред прямо сейчас' },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Top row: Scan Action & Parameters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Main CTA: Scan Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onStartScan}
            disabled={isScanning}
            className={`flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg ${
              isScanning
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-emerald-500/25 active:scale-[0.98]'
            }`}
          >
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Идёт сканирование...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Сканировать связки</span>
              </>
            )}
          </button>

          {/* Quick search input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Поиск по монете / бирже..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* Scan Parameters: OI Rank, Timeframe, Candidate limit */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Max OI Rank Custom Select */}
          <CustomSelect
            label="Макс. OI Ранг:"
            value={maxOiRank}
            onChange={onChangeMaxOiRank}
            options={oiRankOptions}
            disabled={isScanning}
          />

          {/* Candidate Count Custom Select (Количество монет) */}
          <CustomSelect
            label="Глубокий анализ:"
            value={candidateCount}
            onChange={onChangeCandidateCount}
            options={candidateOptions}
            disabled={isScanning}
          />

          {/* Timeframe Toggle (Дни) */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => onChangeTimeframe('15d')}
              disabled={isScanning}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                timeframe === '15d'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              15 Дней
            </button>
            <button
              onClick={() => onChangeTimeframe('30d')}
              disabled={isScanning}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                timeframe === '30d'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              30 Дней
            </button>
          </div>
        </div>
      </div>

      {/* Bottom row: Stability Metric Switching Tabs */}
      <div className="pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span>Сортировка связок по критерию устойчивости:</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {metrics.map((m) => {
            const Icon = m.icon;
            const isActive = activeMetric === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onChangeActiveMetric(m.id)}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 ring-1 ring-emerald-500/20 shadow-md'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`p-1.5 rounded-lg mt-0.5 ${isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold">{m.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">{m.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
