import React, { useRef } from 'react';
import { Loader2, Search, ArrowLeftRight, ShieldCheck, DollarSign, RefreshCw, X, Play, Pause } from 'lucide-react';
import CustomSelect from './CustomSelect';

const modeOptions = [
  { value: 'all', label: 'Все режимы', desc: 'PERP/PERP и SPOT/PERP' },
  { value: 'perp', label: 'Только PERP / PERP', desc: 'Фьючерсный арбитраж спреда' },
  { value: 'spot', label: 'Только SPOT / PERP', desc: 'Cash & Carry базисный арбитраж' },
];

const riskOptions = [
  { value: 'B', label: 'Grade A + B (Рекомендуемые)', desc: 'Только безопасные и проверенные' },
  { value: 'A', label: 'Только Grade A (Низкий риск)', desc: 'Tier-1 биржи, высокий объем и OI' },
  { value: 'all', label: 'Все связки (вкл. Grade C)', desc: 'Включая спекулятивные спреды' },
];

const minSpreadOptions = [
  { value: 0.15, label: 'Чистый спред ≥ 0.15%', desc: 'Минимальный порог после комиссий' },
  { value: 0.3, label: 'Чистый спред ≥ 0.30%', desc: 'Стандартный безубыточный порог' },
  { value: 0.5, label: 'Чистый спред ≥ 0.50%', desc: 'Повышенная доходность' },
  { value: 1.0, label: 'Чистый спред ≥ 1.00%', desc: 'Высокодоходные спреды' },
  { value: 2.0, label: 'Чистый спред ≥ 2.00%', desc: 'Сверхдоходные спреды' },
];

const volumeOptions = [
  { value: 30000, label: 'Объем 24h ≥ $30k', desc: 'Базовый порог ликвидности' },
  { value: 75000, label: 'Объем 24h ≥ $75k', desc: 'Средний объем на обеих ногах' },
  { value: 250000, label: 'Объем 24h ≥ $250k', desc: 'Высокая ликвидность' },
  { value: 1000000, label: 'Объем 24h ≥ $1M', desc: 'Институциональный объем' },
];

export default function SpreadControlsBar({
  isScanning,
  onRefresh,
  mode = 'all',
  onChangeMode,
  maxRisk = 'B',
  onChangeMaxRisk,
  minNetSpread = 0.2,
  onChangeMinNetSpread,
  minVolume = 50000,
  onChangeMinVolume,
  depositSize = 1000,
  onChangeDepositSize,
  searchQuery = '',
  onSearchChange,
  onePairPerSymbol = true,
  onChangeOnePairPerSymbol,
  countdown = 30,
  autoRefreshEnabled = true,
  onToggleAutoRefresh,
}) {
  const searchInputRef = useRef(null);

  const formattedCountdown = `00:${String(countdown).padStart(2, '0')}`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 sm:p-3 shadow-md space-y-2">
      {/* Top Row: CTA, Auto-refresh Countdown, and Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
        {/* Left: Refresh CTA & Auto-refresh timer */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isScanning}
            className={`flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-all shadow-md ${
              isScanning
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:via-indigo-500 hover:to-cyan-400 text-white shadow-indigo-500/25 active:scale-[0.98]'
            }`}
          >
            {isScanning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>Сбор стаканов и спредов...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-white" />
                <span>Обновить спреды</span>
              </>
            )}
          </button>

          {/* Auto Refresh pill with countdown & play/pause toggle */}
          <button
            type="button"
            onClick={onToggleAutoRefresh}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-colors shadow-sm ${
              autoRefreshEnabled
                ? 'bg-slate-950 border-violet-500/30 text-violet-300 hover:border-violet-500/60'
                : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
            title={autoRefreshEnabled ? 'Автообновление включено (кликните для паузы)' : 'Автообновление на паузе'}
          >
            {autoRefreshEnabled ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-slate-600" />
            )}
            <span className="text-[10px] font-sans font-medium text-slate-400">AUTO:</span>
            <span className="font-bold text-white tracking-wider text-[11px]">{formattedCountdown}</span>
            {autoRefreshEnabled ? (
              <Pause className="w-2.5 h-2.5 text-slate-400 hover:text-white" />
            ) : (
              <Play className="w-2.5 h-2.5 text-slate-400 hover:text-white" />
            )}
          </button>

          {/* Quick Search */}
          <div className="relative flex-1 min-w-[180px] sm:min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Поиск монеты или биржи (BTC, SOL, Bybit...)"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  onSearchChange('');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-0.5 rounded-md hover:bg-slate-800/80"
                title="Очистить поиск"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Target Deposit Size Calculator & Deduplication Toggle */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <label className="flex items-center gap-1.5 cursor-pointer select-none bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={onePairPerSymbol}
              onChange={(e) => onChangeOnePairPerSymbol(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-violet-600 focus:ring-violet-500 bg-slate-900 border-slate-700 accent-violet-600 cursor-pointer"
            />
            <span className="text-[11px] text-slate-300 font-medium whitespace-nowrap">
              Без дублей
            </span>
          </label>

          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
            <span className="text-[11px] text-slate-400 pl-1.5 font-medium flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-emerald-400" />
              Депо:
            </span>
            <div className="flex items-center gap-1">
              {[1000, 5000, 10000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => onChangeDepositSize(amt)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                    depositSize === amt
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  ${(amt / 1000).toFixed(0)}k
                </button>
              ))}
              <input
                type="number"
                min="100"
                step="500"
                value={depositSize}
                onChange={(e) => onChangeDepositSize(Math.max(100, Number(e.target.value) || 100))}
                className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-white font-mono font-bold focus:outline-none focus:border-emerald-500 text-right"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Strategy Mode, Risk Filter, Min Spread, Min Volume */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-800/60">
        {/* Strategy Mode */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <ArrowLeftRight className="w-3 h-3 text-violet-400" />
            Тип арбитража:
          </span>
          <CustomSelect
            options={modeOptions}
            value={mode}
            onChange={(val) => onChangeMode(val)}
            minWidth="w-full"
          />
        </div>

        {/* Risk Filter */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            Уровень риска:
          </span>
          <CustomSelect
            options={riskOptions}
            value={maxRisk}
            onChange={(val) => onChangeMaxRisk(val)}
            minWidth="w-full"
          />
        </div>

        {/* Min Net Spread */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-slate-400">
            Мин. чистый спред:
          </span>
          <CustomSelect
            options={minSpreadOptions}
            value={minNetSpread}
            onChange={(val) => onChangeMinNetSpread(Number(val))}
            minWidth="w-full"
          />
        </div>

        {/* Min 24h Volume */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-slate-400">
            Мин. суточный объем:
          </span>
          <CustomSelect
            options={volumeOptions}
            value={minVolume}
            onChange={(val) => onChangeMinVolume(Number(val))}
            minWidth="w-full"
          />
        </div>
      </div>
    </div>
  );
}
