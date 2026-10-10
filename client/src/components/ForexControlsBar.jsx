import React from 'react';
import {
  Loader2,
  Search,
  Globe,
  ShieldCheck,
  BarChart3,
  TrendingUp,
  Zap,
  Award,
  Sparkles,
} from 'lucide-react';

export default function ForexControlsBar({
  isScanning,
  onStartScan,
  timeframe = '30d',
  onChangeTimeframe,
  activeMetric = 'trimmed',
  onChangeActiveMetric,
  searchQuery = '',
  onSearchChange,
}) {
  const metrics = [
    { id: 'score', label: 'Рейтинг входа (0-100)', icon: Award, desc: 'Комплексный скор доходности, окупаемости и риска' },
    { id: 'trimmed', label: 'Очищенный APY (Trimmed)', icon: ShieldCheck, desc: 'Без 5% верхних спайков + WinRate' },
    { id: 'median', label: 'Медианный APY', icon: BarChart3, desc: '100% защита от любых выбросов' },
    { id: 'sharpe', label: 'Шарп', icon: TrendingUp, desc: 'Штрафует спайки и волатильность' },
    { id: 'current', label: 'Текущий APY', icon: Zap, desc: 'Мгновенный спред прямо сейчас' },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Top row: Scan Action & Parameters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Main CTA: Scan Button & Search */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          <button
            onClick={onStartScan}
            disabled={isScanning}
            className={`flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg ${
              isScanning
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/25 active:scale-[0.98]'
            }`}
          >
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Идёт сканирование Forex...</span>
              </>
            ) : (
              <>
                <Globe className="w-4 h-4 text-slate-950 fill-current/20" />
                <span>Сканировать Forex</span>
              </>
            )}
          </button>

          {/* Quick search input */}
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Поиск валюты (EUR, Иена) или биржи..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>

        {/* Right side: Timeframe & Information Pill */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Timeframe switch */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-500 px-2 font-medium">Период:</span>
            {['15d', '30d'].map((tf) => (
              <button
                key={tf}
                onClick={() => onChangeTimeframe(tf)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  timeframe === tf
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Forex Notice Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Без фильтров OI и APY • 100% охват рынка</span>
          </div>
        </div>
      </div>

      {/* Stability Metrics Tabs (5 buttons) */}
      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400 font-medium mr-1 hidden sm:inline">
          Сортировка:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {metrics.map((m) => {
            const Icon = m.icon;
            const isActive = activeMetric === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onChangeActiveMetric(m.id)}
                title={m.desc}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'bg-slate-950 hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
