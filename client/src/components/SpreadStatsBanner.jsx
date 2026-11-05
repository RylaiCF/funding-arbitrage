import React from 'react';
import { ShieldCheck, TrendingUp, DollarSign, Layers, Activity, CheckCircle2 } from 'lucide-react';

export default function SpreadStatsBanner({ stats, opportunitiesCount = 0, depositSize = 1000, maxRisk = 'B' }) {
  const isOnlyA = maxRisk === 'A';
  const isAll = maxRisk === 'all';
  
  const displayCount = isOnlyA
    ? (stats?.gradeACount || opportunitiesCount)
    : isAll
    ? (stats?.totalProfitable || opportunitiesCount)
    : (stats?.gradeACount || 0) + (stats?.gradeBCount || 0);

  const cardTitle = isOnlyA
    ? 'Низкий риск (Grade A)'
    : isAll
    ? 'Все связки (Grade A/B/C)'
    : 'Безопасные (Grade A/B)';

  const cardSubtitle = isOnlyA
    ? `${stats?.gradeACount || 0} Tier-1 с высоким объемом`
    : isAll
    ? `${stats?.gradeACount || 0} Tier-1 + ${stats?.gradeBCount || 0} средний + ${stats?.gradeCCount || 0} спекулятивных`
    : `${stats?.gradeACount || 0} Tier-1 + ${stats?.gradeBCount || 0} со средним объемом`;

  const maxNetSpread = stats?.maxNetSpread || 0;
  const maxProfitUSD = ((maxNetSpread / 100) * depositSize).toFixed(2);
  const avgNetSpread = stats?.avgNetSpread || 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
      {/* 1. Safe Opportunities */}
      <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-2.5 shadow-sm flex flex-col justify-between relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-emerald-500/10 rounded-full blur-lg pointer-events-none" />
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-medium">{cardTitle}</span>
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg sm:text-xl font-bold text-emerald-400 font-mono tracking-tight">
            {displayCount}
          </span>
          <span className="text-[11px] text-slate-400">из {stats?.totalProfitable || opportunitiesCount}</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
          {cardSubtitle}
        </p>
      </div>

      {/* 2. Max Net Spread */}
      <div className="bg-slate-900/90 border border-violet-500/30 rounded-xl p-2.5 shadow-sm flex flex-col justify-between relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-violet-500/10 rounded-full blur-lg pointer-events-none" />
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-medium">Макс. спред</span>
          <TrendingUp className="w-3.5 h-3.5 text-violet-400 shrink-0" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg sm:text-xl font-bold text-violet-300 font-mono tracking-tight">
            +{maxNetSpread > 0 ? maxNetSpread.toFixed(2) : '0.00'}%
          </span>
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
          Чистый спред после комиссий
        </p>
      </div>

      {/* 3. Potential Profit on Deposit */}
      <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-2.5 shadow-sm flex flex-col justify-between relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-cyan-500/10 rounded-full blur-lg pointer-events-none" />
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-medium">Прибыль (${depositSize})</span>
          <DollarSign className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg sm:text-xl font-bold text-cyan-300 font-mono tracking-tight">
            +${maxProfitUSD}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
          На лучшей связке
        </p>
      </div>

      {/* 4. Average Net Spread */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-medium">Средний спред</span>
          <Activity className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg sm:text-xl font-bold text-white font-mono tracking-tight">
            +{avgNetSpread > 0 ? avgNetSpread.toFixed(2) : '0.00'}%
          </span>
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
          По всем отобранным
        </p>
      </div>

      {/* 5. Total Scanned Pairs & Apparatura Ingestion */}
      <div className="col-span-2 md:col-span-4 lg:col-span-1 bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-medium">Проверено пар</span>
          <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg sm:text-xl font-bold text-slate-200 font-mono tracking-tight">
            {stats?.totalScanned || '1,300+'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-emerald-400 font-medium">
          <CheckCircle2 className="w-3 h-3 shrink-0" />
          <span>Нормализация по паспортам</span>
        </div>
      </div>
    </div>
  );
}
