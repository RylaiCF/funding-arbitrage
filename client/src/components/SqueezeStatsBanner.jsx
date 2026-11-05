import React from 'react';
import { Flame, TrendingUp, Zap, HelpCircle, Layers } from 'lucide-react';

export default function SqueezeStatsBanner({ opportunities = [] }) {
  const totalCount = opportunities.length;
  const extremeCount = opportunities.filter((o) => o.severity === 'extreme').length;

  let maxDailyYield = 0;
  let topCoin = null;

  for (const opp of opportunities) {
    if (opp.dailyYieldLongPercent > maxDailyYield) {
      maxDailyYield = opp.dailyYieldLongPercent;
      topCoin = opp;
    }
  }

  return (
    <div className="space-y-3">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Squeeze Coins */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Шорт-сквизы на рынке
            </div>
            <div className="text-lg font-bold text-white flex items-center gap-1.5">
              <span>{totalCount}</span>
              <span className="text-xs text-indigo-400 font-medium">монет в минусе</span>
            </div>
          </div>
        </div>

        {/* Card 2: Extreme Squeezes */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 text-rose-400 fill-current" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Сверхсквизы 💥
            </div>
            <div className="text-lg font-bold text-white flex items-center gap-1.5">
              <span className={extremeCount > 0 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                {extremeCount}
              </span>
              <span className="text-xs text-slate-400 font-normal">
                {extremeCount > 0 ? 'доходность > 4.5%/д' : 'умеренные сквизы'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Max Daily Yield */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Макс. доходность Long
            </div>
            <div className="text-lg font-bold text-white flex items-center gap-1.5">
              <span className={maxDailyYield > 0 ? 'text-emerald-400' : 'text-slate-300'}>
                {maxDailyYield > 0 ? `+${maxDailyYield.toFixed(2)}%` : '—'}
              </span>
              <span className="text-xs text-slate-400 font-normal">в сутки на фандинге</span>
            </div>
          </div>
        </div>

        {/* Card 4: Top Opportunity Leader */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-purple-400" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider truncate">
              Лидер сквиза
            </div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
              {topCoin ? (
                <>
                  <span className="text-purple-300 font-mono">{topCoin.symbol}</span>
                  <span className="text-xs text-slate-400 font-normal truncate">
                    ({topCoin.squeezedDisplayName})
                  </span>
                </>
              ) : (
                <span className="text-slate-500 font-normal">Нет данных</span>
              )}
            </div>
            {topCoin && (
              <div className="text-[10px] text-emerald-400 font-mono">
                +{topCoin.dailyYieldLongPercent}% / день
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Explanatory Banner: Mechanics of Negative Funding Arb */}
      <div className="bg-gradient-to-r from-rose-950/40 via-amber-950/20 to-slate-900/60 border border-rose-500/20 rounded-xl p-3 sm:px-4 flex items-start sm:items-center justify-between gap-3 text-xs text-slate-300">
        <div className="flex items-start sm:items-center gap-2.5">
          <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
          <div>
            <span className="font-semibold text-amber-300">Механика заработка на отрицательном фандинге: </span>
            <span className="text-slate-400">
              Когда монету сильно шортят, фандинг уходит в глубокий минус — <strong className="text-slate-200">шортисты платят лонгам</strong>.
              Чтобы забрать этот процент без риска цены монеты, открывается <strong className="text-emerald-400">Long Perp</strong> (собирает выплаты), а дельта хеджируется через <strong className="text-rose-400">Short Spot Margin</strong> (заем на споте) либо Short Perp на бирже со спокойным фандингом.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
