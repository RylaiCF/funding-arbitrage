import React from 'react';
import { Layers, Settings, Database, Activity, RefreshCw } from 'lucide-react';

export default function Header({ exchanges, onOpenSettings, lastScannedTime }) {
  const enabledCount = exchanges.filter(e => e.is_enabled).length;
  const totalCount = exchanges.length;

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Layers className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">Funding Arbitrage Scanner</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Loris.tools
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Поиск устойчивого арбитража фандинга за 15–30 дней без спайков
            </p>
          </div>
        </div>

        {/* Right Info & Actions */}
        <div className="flex items-center gap-3">
          {lastScannedTime && (
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Обновлено: {new Date(lastScannedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>SQLite Active</span>
          </div>

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-all shadow-sm"
          >
            <Settings className="w-3.5 h-3.5 text-slate-300" />
            <span>Биржи</span>
            <span className={`px-1.5 py-0.2 rounded text-[11px] font-semibold ${
              enabledCount < 2 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {enabledCount}/{totalCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
