import React from 'react';
import { Globe, ShieldCheck, TrendingUp, Landmark, Sparkles } from 'lucide-react';

export default function ForexStatsBanner({ opportunities = [], currenciesCount = 17 }) {
  const pairsCount = opportunities.reduce(
    (acc, opp) => acc + (opp.allPairs ? opp.allPairs.length : 1),
    0
  );

  let bestApy = 0;
  for (const opp of opportunities) {
    const apy = opp.metrics?.trimmed?.trimmedMeanApy ?? opp.currentSpreadApy ?? 0;
    if (apy > bestApy) bestApy = apy;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* Card 1: Total Currencies */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3 shadow-md">
        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
          <Globe className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Активных валют
          </div>
          <div className="text-lg font-bold text-white flex items-center gap-1.5">
            <span>{opportunities.length}</span>
            <span className="text-xs text-slate-400 font-normal">валют с арбитражем</span>
          </div>
        </div>
      </div>

      {/* Card 2: Total Active Pairs */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3 shadow-md">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <Landmark className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Доступных связок бирж
          </div>
          <div className="text-lg font-bold text-white flex items-center gap-1.5">
            <span>{pairsCount}</span>
            <span className="text-xs text-emerald-400 font-medium">между CEX и DEX</span>
          </div>
        </div>
      </div>

      {/* Card 3: Best Spread APY */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3 shadow-md">
        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
          <TrendingUp className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Макс. стабильный APY
          </div>
          <div className="text-lg font-bold text-white flex items-center gap-1.5">
            <span className={bestApy > 0 ? 'text-emerald-400' : 'text-slate-300'}>
              {bestApy > 0 ? `+${bestApy.toFixed(1)}%` : '—'}
            </span>
            <span className="text-xs text-slate-400 font-normal">Trimmed Mean</span>
          </div>
        </div>
      </div>

      {/* Card 4: Risk Profile */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3 shadow-md">
        <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-teal-400" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Профиль волатильности
          </div>
          <div className="text-xs font-semibold text-teal-300 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-teal-400" />
            <span>Фиатная стабильность</span>
          </div>
          <div className="text-[10px] text-slate-400">Без риска крипто-дампов</div>
        </div>
      </div>
    </div>
  );
}
