import React from 'react';
import { Clock } from 'lucide-react';
import RiskBadge from './RiskBadge';

export default function ChartPairSelector({
  symbol,
  pairs,
  selectedPairIndex,
  onSelectPair,
  activeItem,
  volatilityData,
  activeBreakEven,
  exchangeNameMap,
  getBreakEven,
}) {
  if (!pairs || pairs.length <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
      <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
        <span className="text-xs font-semibold text-slate-300 whitespace-nowrap">
          Прибыльные связки для {symbol}:
        </span>
        <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 whitespace-nowrap">
          {pairs.length} связок
        </span>
        <RiskBadge item={activeItem} volatilityData={volatilityData} />
        <div
          className={`font-mono font-bold text-xs px-2 py-0.5 rounded-lg border inline-flex items-center gap-1 shadow-sm shrink-0 whitespace-nowrap ${
            activeBreakEven.status === 'fast'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : activeBreakEven.status === 'normal'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
          title={`Время окупаемости комиссий: ${activeBreakEven.text} (round-trip ~0.18%)`}
        >
          <Clock className="w-3 h-3 shrink-0" />
          <span>{activeBreakEven.text}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 flex-1 sm:ml-auto">
        {pairs.map((p, pIdx) => {
          const isSelected = pIdx === selectedPairIndex;
          const lName = exchangeNameMap[p.longExchange] || p.longExchange;
          const sName = exchangeNameMap[p.shortExchange] || p.shortExchange;
          const apy = p.metrics?.trimmed?.trimmedMeanApy ?? p.currentSpreadApy;
          const pBreakEven = getBreakEven(p);

          return (
            <button
              key={`${p.longExchange}-${p.shortExchange}`}
              type="button"
              onClick={() => onSelectPair(pIdx)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span className="capitalize">{lName}</span>
              <span className="text-slate-500 text-[10px]">➔</span>
              <span className="capitalize">{sName}</span>
              <span className={`font-mono font-bold ml-0.5 ${isSelected ? 'text-emerald-300' : 'text-slate-400'}`}>
                +{apy}%
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                • {pBreakEven.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
