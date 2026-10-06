import React from 'react';
import {
  ShieldAlert,
  Clock,
  TrendingUp,
  TrendingDown,
  Hourglass,
  AlertTriangle,
} from 'lucide-react';

export default function ChartStatCards({
  activeItem,
  hasHighSpike,
  activeBreakEven,
  activeTrend,
  activeHalfLife,
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-9 gap-2.5">
      {/* 1. Trimmed APY */}
      <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
        <div className="text-[11px] text-slate-400 font-medium">Очищенный APY</div>
        <div className="text-base font-bold text-emerald-400 mt-0.5">
          +{activeItem.metrics?.trimmed?.trimmedMeanApy || 0}%
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">Без 5% спайков</div>
      </div>

      {/* 2. Median APY */}
      <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
        <div className="text-[11px] text-slate-400 font-medium">Медианный APY</div>
        <div className="text-base font-bold text-teal-400 mt-0.5">
          +{activeItem.metrics?.median?.medianApy || 0}%
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">50-й перцентиль</div>
      </div>

      {/* 3. Sharpe */}
      <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
        <div className="text-[11px] text-slate-400 font-medium">Шарп фандинга</div>
        <div className="text-base font-bold text-cyan-400 mt-0.5">
          {activeItem.metrics?.sharpe?.sharpeRatio || 0}
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">
          Волатильность: ±{activeItem.metrics?.sharpe?.volatilityStdDev || 0}%
        </div>
      </div>

      {/* 4. WinRate */}
      <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
        <div className="text-[11px] text-slate-400 font-medium">Вин-Рейт (Часы/Дни)</div>
        <div className="text-base font-bold text-slate-200 mt-0.5">
          {activeItem.winRateHoursPercent}% / {activeItem.dailyWinRatePercent}%
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">
          {activeItem.profitableDays} из {activeItem.totalDays} дней в плюс
        </div>
      </div>

      {/* 5. Raw Mean */}
      <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
        <div className="text-[11px] text-slate-400 font-medium">Неочищенный средний</div>
        <div className="text-base font-bold text-slate-300 mt-0.5">
          {activeItem.rawMeanApy}%
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">С учетом выбросов</div>
      </div>

      {/* 6. Max Spike */}
      <div
        className={`p-2.5 rounded-xl border ${
          hasHighSpike
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-slate-900/80 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
          <span>Макс. Спайк</span>
          {hasHighSpike && <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />}
        </div>
        <div
          className={`text-base font-bold mt-0.5 ${
            hasHighSpike ? 'text-amber-400' : 'text-slate-300'
          }`}
        >
          +{activeItem.maxSpikeApy}%
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">
          {hasHighSpike ? 'Выброс нейтрализован' : 'Без аномалий'}
        </div>
      </div>

      {/* 7. Payback (Break-even) */}
      <div
        className={`p-2.5 rounded-xl border ${
          activeBreakEven.status === 'fast'
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : activeBreakEven.status === 'normal'
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-rose-500/10 border-rose-500/30'
        }`}
      >
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
          <span>Окупаемость</span>
          <Clock
            className={`w-3.5 h-3.5 ${
              activeBreakEven.status === 'fast'
                ? 'text-emerald-400'
                : activeBreakEven.status === 'normal'
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          />
        </div>
        <div
          className={`text-base font-bold mt-0.5 ${
            activeBreakEven.status === 'fast'
              ? 'text-emerald-300'
              : activeBreakEven.status === 'normal'
              ? 'text-amber-300'
              : 'text-rose-300'
          }`}
        >
          {activeBreakEven.text}
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">Round-trip ~0.18%</div>
      </div>

      {/* 8. Funding Trend */}
      <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
          <span>Тренд фандинга</span>
          {activeTrend.direction === 'expanding' && (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          )}
          {activeTrend.direction === 'decaying' && (
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
          )}
        </div>
        <div
          className={`text-base font-bold mt-0.5 ${
            activeTrend.spread24hApy >= 0 ? 'text-slate-200' : 'text-rose-400'
          }`}
        >
          {activeTrend.spread24hApy >= 0
            ? `+${activeTrend.spread24hApy}%`
            : `${activeTrend.spread24hApy}%`}
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">
          7д: {activeTrend.spread7dApy >= 0 ? `+${activeTrend.spread7dApy}%` : `${activeTrend.spread7dApy}%`} ({activeTrend.label})
        </div>
      </div>

      {/* 9. Half-Life & Sustainability */}
      <div
        className={`p-2.5 rounded-xl border ${
          activeHalfLife.warning
            ? 'bg-rose-500/10 border-rose-500/30 ring-1 ring-rose-500/20'
            : activeHalfLife.sustainability === 'high'
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-slate-900/80 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
          <span title="Период полураспада спреда (модель Орнштейна-Уленбека)">Полураспад (t½)</span>
          {activeHalfLife.warning ? (
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          ) : (
            <Hourglass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          )}
        </div>
        <div
          className={`text-base font-bold mt-0.5 font-mono ${
            activeHalfLife.warning
              ? 'text-rose-300'
              : activeHalfLife.sustainability === 'high'
              ? 'text-emerald-300'
              : 'text-cyan-300'
          }`}
        >
          {activeHalfLife.text}
        </div>
        <div
          className="text-[10px] text-slate-400 mt-0.5 truncate"
          title={
            activeHalfLife.warning
              ? 'Спред затухает быстрее, чем окупаются комиссии!'
              : `Запас стойкости: ${
                  activeHalfLife.ratio
                    ? activeHalfLife.ratio + 'x от окупаемости'
                    : activeHalfLife.label
                }`
          }
        >
          {activeHalfLife.warning
            ? '⚠️ Быстрее окупаемости'
            : activeHalfLife.ratio
            ? `${activeHalfLife.ratio}x от окупаемости`
            : activeHalfLife.label}
        </div>
      </div>
    </div>
  );
}
