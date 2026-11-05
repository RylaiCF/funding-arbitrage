import React, { useState, useRef } from 'react';
import { AlertTriangle, TrendingUp, ShieldCheck, Clock, ShieldAlert } from 'lucide-react';
import { evaluateEntryScore } from '../utils/entryScoreEvaluator';

export default function ScoreBadge({ item, volatilityData = null, className = '' }) {
  const [openUpwards, setOpenUpwards] = useState(false);
  const badgeRef = useRef(null);

  const evaluation = evaluateEntryScore(item, volatilityData);
  const { score, tier, tierLabel, tierColor, breakdown, penalties, recommendation } = evaluation;

  const handleMouseEnter = () => {
    if (badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 340 && spaceAbove > spaceBelow) {
        setOpenUpwards(true);
      } else {
        setOpenUpwards(false);
      }
    }
  };

  const getColorStyles = () => {
    switch (tierColor) {
      case 'emerald':
        return {
          bg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
          border: 'border-emerald-500/30',
          text: 'text-emerald-300',
          tierBg: 'bg-emerald-500/25 text-emerald-200 border-emerald-500/40',
          barColor: 'bg-emerald-500',
        };
      case 'cyan':
        return {
          bg: 'bg-cyan-500/10 hover:bg-cyan-500/20',
          border: 'border-cyan-500/30',
          text: 'text-cyan-300',
          tierBg: 'bg-cyan-500/25 text-cyan-200 border-cyan-500/40',
          barColor: 'bg-cyan-500',
        };
      case 'amber':
        return {
          bg: 'bg-amber-500/10 hover:bg-amber-500/20',
          border: 'border-amber-500/30',
          text: 'text-amber-300',
          tierBg: 'bg-amber-500/25 text-amber-200 border-amber-500/40',
          barColor: 'bg-amber-500',
        };
      case 'orange':
        return {
          bg: 'bg-orange-500/10 hover:bg-orange-500/20',
          border: 'border-orange-500/30',
          text: 'text-orange-300',
          tierBg: 'bg-orange-500/25 text-orange-200 border-orange-500/40',
          barColor: 'bg-orange-500',
        };
      case 'rose':
      default:
        return {
          bg: 'bg-rose-500/10 hover:bg-rose-500/20',
          border: 'border-rose-500/30',
          text: 'text-rose-300',
          tierBg: 'bg-rose-500/25 text-rose-200 border-rose-500/40',
          barColor: 'bg-rose-500',
        };
    }
  };

  const styles = getColorStyles();

  return (
    <div
      ref={badgeRef}
      onMouseEnter={handleMouseEnter}
      className={`relative inline-flex items-center shrink-0 whitespace-nowrap group cursor-help select-none hover:z-50 ${className}`}
    >
      {/* Clickable/Hoverable Pill Badge */}
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border font-mono font-bold text-xs transition-colors shrink-0 whitespace-nowrap shadow-sm ${styles.bg} ${styles.border} ${styles.text}`}
      >
        <span className="text-xs font-black tracking-tight">{score}</span>
        <span
          className={`px-1 py-0.2 rounded text-[9px] font-black uppercase border tracking-wider ${styles.tierBg}`}
        >
          {tier}
        </span>
      </div>

      {/* Interactive Tooltip Popup */}
      <div
        className={`absolute left-0 ${
          openUpwards ? 'bottom-full mb-2' : 'top-full mt-2'
        } w-80 p-3.5 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl text-[11px] text-slate-300 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 z-50 text-left space-y-2.5 whitespace-normal`}
      >
        {/* Header: Score & Tier */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className={`text-base font-black font-mono ${styles.text}`}>
              {score}
              <span className="text-xs text-slate-500 font-normal">/100</span>
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${styles.tierBg}`}>
              Ранг {tier} • {tierLabel}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Оценка входа</span>
        </div>

        {/* Practical Recommendation */}
        <div className="text-[11px] text-slate-200 bg-slate-800/60 p-2 rounded-lg border border-slate-700/50 leading-relaxed">
          {recommendation}
        </div>

        {/* 4 Factor Bars */}
        <div className="space-y-1.5 pt-0.5">
          {/* 1. Yield Factor */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                <span>Доходность (очищ. APY)</span>
              </span>
              <span className="font-mono font-semibold text-slate-200">
                {breakdown.yield.score} / {breakdown.yield.max} б.
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all"
                style={{ width: `${(breakdown.yield.score / breakdown.yield.max) * 100}%` }}
              />
            </div>
          </div>

          {/* 2. Stability Factor */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-cyan-400" />
                <span>Стабильность (Шарп & Win-Rate)</span>
              </span>
              <span className="font-mono font-semibold text-slate-200">
                {breakdown.stability.score} / {breakdown.stability.max} б.
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-cyan-400 h-full rounded-full transition-all"
                style={{ width: `${(breakdown.stability.score / breakdown.stability.max) * 100}%` }}
              />
            </div>
          </div>

          {/* 3. Payback & Trend */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Окупаемость & Тренд</span>
              </span>
              <span className="font-mono font-semibold text-slate-200">
                {breakdown.payback.score} / {breakdown.payback.max} б.
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-400 h-full rounded-full transition-all"
                style={{ width: `${(breakdown.payback.score / breakdown.payback.max) * 100}%` }}
              />
            </div>
          </div>

          {/* 4. Safety & Liquidity */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
              <span className="flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-indigo-400" />
                <span>Ликвидность & Безопасность</span>
              </span>
              <span className="font-mono font-semibold text-slate-200">
                {breakdown.safety.score} / {breakdown.safety.max} б.
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-400 h-full rounded-full transition-all"
                style={{ width: `${(breakdown.safety.score / breakdown.safety.max) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Penalties if any */}
        {penalties.length > 0 && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-2 space-y-1">
            <div className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>Штрафы скоринга:</span>
            </div>
            <ul className="text-[10px] text-rose-300 space-y-0.5 pl-3 list-disc">
              {penalties.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
