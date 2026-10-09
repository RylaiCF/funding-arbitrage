import React from 'react';
import {
  ExternalLink,
  ArrowRight,
  Clock,
  TrendingUp,
  TrendingDown,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import ExchangeBadge from './ExchangeBadge';
import RiskBadge from './RiskBadge';
import ScoreBadge from './ScoreBadge';
import ChartTimeline from './ChartTimeline';
import { getBreakEven, getTrend } from '../utils/metricsHelper';

export default function TableRow({
  item,
  idx,
  isExpanded,
  onToggleExpand,
  activeMetric,
  exchangeNameMap,
  volatilityMap,
  timeframe,
}) {
  const breakEven = getBreakEven(item, activeMetric);
  const trend = getTrend(item);
  const coinVolatility = volatilityMap[item.symbol] || item.priceVolatility;

  return (
    <React.Fragment>
      <tr
        onClick={onToggleExpand}
        className={`cursor-pointer transition-colors hover:relative hover:z-20 ${
          isExpanded ? 'bg-slate-800/70 relative z-10' : 'hover:bg-slate-800/40'
        }`}
      >
        {/* 1. Index */}
        <td className="py-2.5 px-1.5 sm:px-2 text-center font-mono text-slate-500 font-medium">
          {idx + 1}
        </td>

        {/* 2. Entry Score (Composite Rating 0-100) */}
        <td className="py-2.5 px-1.5 sm:px-2 text-center whitespace-nowrap">
          <ScoreBadge
            item={item}
            volatilityData={coinVolatility}
          />
        </td>

        {/* 3. Symbol & OI Rank (Fixed: No line wrapping) */}
        <td className="py-2.5 px-1.5 sm:px-2 whitespace-nowrap">
          <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
            <div className="font-bold text-white text-sm tracking-wide shrink-0">
              {item.symbol}
            </div>
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 whitespace-nowrap shrink-0 inline-flex items-center"
              title="Open Interest Rank: чем меньше, тем выше ликвидность"
            >
              OI&nbsp;#{item.oiRank}
            </span>
            <a
              href={`https://loris.tools/backtester?token=${encodeURIComponent(item.symbol)}&longToken=${encodeURIComponent(item.symbol)}&shortToken=${encodeURIComponent(item.symbol)}&exchange1=${encodeURIComponent(item.longExchange)}&exchange2=${encodeURIComponent(item.shortExchange)}&timeframe=${timeframe}&unit=APY&position=2000&execution=10`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded text-slate-500 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors shrink-0"
              title={`Открыть связку в бэктестере Loris (${timeframe} APY, position=$2,000)`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </td>

        {/* 4. Long -> Short exchanges */}
        <td className="py-2.5 px-1.5 sm:px-2 whitespace-nowrap">
          <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
            <ExchangeBadge
              exchangeId={item.longExchange}
              displayName={exchangeNameMap[item.longExchange]}
              symbol={item.symbol}
              isLong={true}
            />
            <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
            <ExchangeBadge
              exchangeId={item.shortExchange}
              displayName={exchangeNameMap[item.shortExchange]}
              symbol={item.symbol}
              isShort={true}
            />
          </div>
        </td>

        {/* 5. Risk & Payback (Break-even) */}
        <td className="py-2.5 px-1.5 sm:px-2 whitespace-nowrap">
          <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
            <RiskBadge
              item={item}
              volatilityData={coinVolatility}
            />
            <div
              className={`font-mono font-bold text-xs px-1.5 py-0.5 rounded-lg border inline-flex items-center gap-1 shadow-sm shrink-0 whitespace-nowrap ${
                breakEven.status === 'fast'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : breakEven.status === 'normal'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
              title={`Время окупаемости комиссий: ${breakEven.text} при round-trip ~0.18%`}
            >
              <Clock className="w-3 h-3 shrink-0" />
              <span>{breakEven.text}</span>
            </div>
          </div>
        </td>

        {/* 6. Funding Trend */}
        <td className="py-2.5 px-1.5 sm:px-2 text-right whitespace-nowrap">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className={`font-bold ${trend.spread24hApy >= 0 ? 'text-slate-200' : 'text-rose-400'}`}>
                {trend.spread24hApy >= 0 ? `+${trend.spread24hApy}%` : `${trend.spread24hApy}%`}
              </span>
              {trend.direction === 'expanding' && (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
              {trend.direction === 'stable' && (
                <span className="text-slate-500 text-xs">➔</span>
              )}
              {trend.direction === 'decaying' && (
                <TrendingDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
              <span>7д:</span>
              <span className="text-slate-400 font-mono">
                {trend.spread7dApy >= 0 ? `+${trend.spread7dApy}%` : `${trend.spread7dApy}%`}
              </span>
              <span className={`px-1 py-0.2 rounded text-[9px] font-semibold ${
                trend.direction === 'expanding'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : trend.direction === 'decaying'
                  ? 'bg-rose-500/10 text-rose-400'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {trend.label}
              </span>
            </div>
          </div>
        </td>

        {/* 7. Current Spread APY */}
        <td className="py-2.5 px-1.5 sm:px-2 text-right whitespace-nowrap">
          <div className="font-bold font-mono text-slate-200">
            {item.currentSpreadApy >= 0 ? `+${item.currentSpreadApy}%` : `${item.currentSpreadApy}%`}
          </div>
          <div className="text-[10px] text-slate-500">
            {item.currentRateLongApy}% / {item.currentRateShortApy}%
          </div>
        </td>

        {/* 8. Trimmed Mean APY */}
        <td className="py-2.5 px-1.5 sm:px-2 text-right whitespace-nowrap">
          <div className={`font-mono font-bold ${activeMetric === 'trimmed' ? 'text-emerald-400 text-sm' : 'text-slate-300'}`}>
            {(item.metrics?.trimmed?.trimmedMeanApy || 0) >= 0 ? `+${item.metrics?.trimmed?.trimmedMeanApy || 0}%` : `${item.metrics?.trimmed?.trimmedMeanApy || 0}%`}
          </div>
          <div className="text-[10px] text-slate-500">
            Вин-рейт {item.winRateHoursPercent}%
          </div>
        </td>

        {/* 9. Median APY */}
        <td className="py-2.5 px-1.5 sm:px-2 text-right whitespace-nowrap">
          <div className={`font-mono font-bold ${activeMetric === 'median' ? 'text-teal-400 text-sm' : 'text-slate-300'}`}>
            {(item.metrics?.median?.medianApy || 0) >= 0 ? `+${item.metrics?.median?.medianApy || 0}%` : `${item.metrics?.median?.medianApy || 0}%`}
          </div>
          <div className="text-[10px] text-slate-500">
            {item.profitableDays}/{item.totalDays} дней в +
          </div>
        </td>

        {/* 10. Sharpe Ratio */}
        <td className="py-2.5 px-1.5 sm:px-2 text-right whitespace-nowrap">
          <div className={`font-mono font-bold ${activeMetric === 'sharpe' ? 'text-cyan-400 text-sm' : 'text-slate-300'}`}>
            {item.metrics?.sharpe?.sharpeRatio || 0}
          </div>
          <div className="text-[10px] text-slate-500">
            σ = {item.metrics?.sharpe?.volatilityStdDev || 0}%
          </div>
        </td>

        {/* 11. Expand icon */}
        <td className="py-2.5 px-1 text-center w-7">
          <button
            type="button"
            className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </td>
      </tr>

      {/* Expanded Row with Timeline Chart */}
      {isExpanded && (
        <tr className="bg-slate-900/90">
          <td colSpan="11" className="p-4 sm:p-6 border-b border-slate-800">
            <ChartTimeline
              item={item}
              exchangeNameMap={exchangeNameMap}
              timeframe={timeframe}
              volatilityData={coinVolatility}
            />
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}
