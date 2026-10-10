import { Layers, Settings, Database, Activity, RefreshCw, Sparkles, Globe, Coins } from 'lucide-react';

export default function Header({
  exchanges,
  onOpenSettings,
  lastScannedTime,
  newExchangesCount = 0,
  activeTab = 'crypto',
  onTabChange = () => {},
  cryptoCount = 0,
  forexCount = 0,
}) {
  const enabledCount = exchanges.filter(e => e.is_enabled).length;
  const totalCount = exchanges.length;

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-[1560px] w-full mx-auto px-4 sm:px-6 lg:px-8 h-16 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* Left: Logo & Title */}
        <div className="flex items-center gap-3 justify-start min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <Layers className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight truncate">Funding Arbitrage Scanner</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                Loris.tools
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block truncate">
              Поиск устойчивого арбитража фандинга за 15–30 дней без спайков
            </p>
          </div>
        </div>

        {/* Center: Primary Page Navigation Switcher */}
        <div className="flex items-center justify-center min-w-0 shrink-0">
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 shadow-inner shrink-0">
            <button
              onClick={() => onTabChange('crypto')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold shrink-0 whitespace-nowrap transition-colors duration-100 ${
                activeTab === 'crypto'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <Coins className="w-3.5 h-3.5 shrink-0" />
              <span>Криптовалюты</span>
              {cryptoCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold shrink-0 ${
                    activeTab === 'crypto'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {cryptoCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onTabChange('forex')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold shrink-0 whitespace-nowrap transition-colors duration-100 ${
                activeTab === 'forex'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span>Forex / Валюты</span>
              {forexCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold shrink-0 ${
                    activeTab === 'forex'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {forexCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Right Info & Actions */}
        <div className="flex items-center justify-end gap-3 min-w-0">
          {lastScannedTime && (
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50 shrink-0">
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Обновлено: {new Date(lastScannedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50 shrink-0">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>SQLite Active</span>
          </div>

          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all shadow-sm shrink-0 ${
              newExchangesCount > 0
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-amber-500/40 ring-1 ring-amber-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-slate-300" />
            <span>Биржи</span>
            <span className={`px-1.5 py-0.2 rounded text-[11px] font-semibold ${
              enabledCount < 2 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {enabledCount}/{totalCount}
            </span>
            {newExchangesCount > 0 && (
              <span
                className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-0.5 animate-pulse"
                title={`На Loris.tools обнаружены новые биржи (${newExchangesCount})`}
              >
                <Sparkles className="w-2.5 h-2.5" />
                +{newExchangesCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
