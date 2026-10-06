import React from 'react';
import { ShieldCheck, AlertTriangle, Zap, Activity } from 'lucide-react';
import { evaluateRisk } from '../utils/riskEvaluator';

export default function RiskBadge({ item, volatilityData = null, className = '' }) {
  const risk = evaluateRisk(item, volatilityData);

  const getStyle = () => {
    switch (risk.level) {
      case 'low':
        return {
          bg: 'bg-emerald-500/10',
          text: 'text-emerald-400',
          border: 'border-emerald-500/30',
          dot: 'bg-emerald-400',
          icon: <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />,
        };
      case 'medium':
        return {
          bg: 'bg-amber-500/10',
          text: 'text-amber-400',
          border: 'border-amber-500/30',
          dot: 'bg-amber-400',
          icon: <Zap className="w-3 h-3 text-amber-400 shrink-0" />,
        };
      case 'high':
      default:
        return {
          bg: 'bg-rose-500/10',
          text: 'text-rose-400',
          border: 'border-rose-500/30',
          dot: 'bg-rose-400',
          icon: <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />,
        };
    }
  };

  const style = getStyle();

  return (
    <div className={`relative inline-flex items-center group cursor-help select-none ${className}`}>
      {/* Badge Button */}
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${style.bg} ${style.text} ${style.border} transition-colors`}
      >
        {style.icon}
        <span>{risk.badgeText}</span>
      </span>

      {/* Floating Detailed Risk Tooltip */}
      <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl text-[11px] text-slate-300 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 z-50 text-left space-y-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <div className="flex items-center gap-1.5 font-bold">
            <span className={`w-2 h-2 rounded-full ${style.dot}`}></span>
            <span className={style.text}>{risk.label}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Оценка риска
          </span>
        </div>

        {/* Price Volatility & ATR if available */}
        {risk.priceVol !== null && (
          <div className="bg-slate-800/60 p-1.5 rounded-lg border border-slate-700/40 space-y-0.5">
            <div className="flex items-center gap-1 text-slate-400 text-[10px] font-medium">
              <Activity className="w-3 h-3 text-cyan-400" />
              <span>Волатильность цены базового токена:</span>
            </div>
            <div className="font-mono text-xs font-bold text-white flex items-center justify-between">
              <span>{risk.priceVol}% <span className="text-[10px] text-slate-400 font-normal">годовых</span></span>
              <span className="text-cyan-300 text-[11px]">ATR ±{risk.avgAtr}%/день</span>
            </div>
          </div>
        )}

        {/* Risk factors bullet list */}
        {risk.reasons.length > 0 && (
          <div className="space-y-1 text-[10px] text-slate-300">
            <div className="text-slate-400 font-medium">Ключевые факторы:</div>
            <ul className="space-y-0.5">
              {risk.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="text-slate-500">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommended Leverage */}
        <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
          <span className="text-slate-400">Плечо:</span>
          <span className="font-semibold text-slate-200">{risk.recommendedLeverage}</span>
        </div>
      </div>
    </div>
  );
}
