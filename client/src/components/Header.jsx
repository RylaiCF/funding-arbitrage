import { Layers, Settings, Database, RefreshCw, Sparkles, Globe, Coins, Flame, Scale } from 'lucide-react';

export default function Header({
  exchanges,
  onOpenSettings,
  lastScannedTime,
  newExchangesCount = 0,
  activeTab = 'crypto',
  onTabChange = () => {},
  cryptoCount = 0,
  forexCount = 0,
  squeezeCount = 0,
  spreadCount = 0,
}) {
  const enabledCount = exchanges.filter(e => e.is_enabled && !e.is_hard_disabled && !['mexc', 'bitget', 'kucoin'].includes(e.id)).length;
  const totalCount = exchanges.length;

  return (
    <header className="border-b border-slate-800 bg-slate-900 shadow-md shadow-black/20">
      {/* 1. Main Header Bar: Compact Logo & Settings */}
      <div className="max-w-[1600px] w-full mx-auto px-3 sm:px-6 h-11 sm:h-12 flex items-center justify-between gap-3">
        {/* Left: Logo & Title */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
            <Layers className="w-3.5 h-3.5 text-slate-950 font-bold" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm font-bold text-white tracking-tight truncate">Funding Arbitrage Scanner</h1>
            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              Loris.tools
            </span>
          </div>
        </div>

        {/* Right Info & Actions */}
        <div className="flex items-center justify-end gap-2 shrink-0">
          {lastScannedTime && (
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-700/50 shrink-0">
              <RefreshCw className="w-3 h-3 text-slate-400" />
              <span>Обновлено: {new Date(lastScannedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
          )}

          <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-700/50 shrink-0">
            <Database className="w-3 h-3 text-cyan-400" />
            <span>SQLite Active</span>
          </div>

          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all shadow-sm shrink-0 ${
              newExchangesCount > 0
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-amber-500/40 ring-1 ring-amber-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600'
            }`}
          >
            <Settings className="w-3 h-3 text-slate-300" />
            <span>Биржи</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
              enabledCount < 2 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {enabledCount}/{totalCount}
            </span>
            {newExchangesCount > 0 && (
              <span
                className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-0.5 animate-pulse"
                title={`На Loris.tools обнаружены новые биржи (${newExchangesCount})`}
              >
                <Sparkles className="w-2 h-2" />
                +{newExchangesCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Secondary Navigation Sub-bar (Compact Tabs Row) */}
      <div className="border-t border-slate-800/70 bg-slate-950/60 backdrop-blur-sm">
        <div className="max-w-[1600px] w-full mx-auto px-3 sm:px-6 py-1 sm:py-1.5 flex items-center justify-start overflow-x-auto no-scrollbar">
          <div className="flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-slate-800 shadow-inner shrink-0 gap-1">
            <button
              onClick={() => onTabChange('crypto')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-md text-xs font-semibold shrink-0 whitespace-nowrap transition-all duration-150 ${
                activeTab === 'crypto'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-500/25 ring-1 ring-emerald-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Coins className="w-3.5 h-3.5 shrink-0" />
              <span>Криптовалюты</span>
              {cryptoCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold shrink-0 ${
                    activeTab === 'crypto'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                  }`}
                >
                  {cryptoCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onTabChange('forex')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-md text-xs font-semibold shrink-0 whitespace-nowrap transition-all duration-150 ${
                activeTab === 'forex'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm shadow-cyan-500/25 ring-1 ring-cyan-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span>Forex / Валюты</span>
              {forexCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold shrink-0 ${
                    activeTab === 'forex'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                  }`}
                >
                  {forexCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onTabChange('squeeze')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-md text-xs font-semibold shrink-0 whitespace-nowrap transition-all duration-150 ${
                activeTab === 'squeeze'
                  ? 'bg-gradient-to-r from-rose-600 via-amber-600 to-orange-600 text-white shadow-sm shadow-rose-500/25 ring-1 ring-rose-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Flame className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'squeeze' ? 'text-amber-200 fill-current' : 'text-rose-400'}`} />
              <span>Радар сквизов</span>
              {squeezeCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold shrink-0 ${
                    activeTab === 'squeeze'
                      ? 'bg-white/20 text-white'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {squeezeCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onTabChange('spread')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-md text-xs font-semibold shrink-0 whitespace-nowrap transition-all duration-150 ${
                activeTab === 'spread'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm shadow-violet-500/25 ring-1 ring-violet-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Scale className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'spread' ? 'text-violet-200' : 'text-violet-400'}`} />
              <span>Арбитраж цен (Spread)</span>
              {spreadCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold shrink-0 ${
                    activeTab === 'spread'
                      ? 'bg-white/20 text-white'
                      : 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  }`}
                >
                  {spreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
